import { query } from "../config/db.js";
import { tokenize, generateSnippet } from "../utils/textProcessor.js";
import { calculateNormalizedTFIDF, calculateIDF } from "./tfIdf.js";
import { decryptDocument } from "../services/encryptionService.js";

/**
 * Parse query string for boolean operators
 * Supports: "phrase", "term1 AND term2", "term1 AND NOT term2"
 * @param {string} queryString - Raw query string
 * @returns {Object} Parsed query { type, terms, includeTerms, excludeTerms }
 */
export const parseQuery = (queryString) => {
	const trimmed = queryString.trim();

	// Check for AND NOT operator
	if (trimmed.includes(" AND NOT ")) {
		const parts = trimmed.split(" AND NOT ");
		const includeTerms = tokenize(parts[0].replace(/"/g, ""));
		const excludeTerms = tokenize(parts[1].replace(/"/g, ""));

		return {
			type: "AND_NOT",
			terms: [...includeTerms, ...excludeTerms],
			includeTerms,
			excludeTerms,
			originalQuery: queryString
		};
	}

	// Check for AND operator
	if (trimmed.includes(" AND ")) {
		const parts = trimmed.split(" AND ");
		const terms = parts.flatMap((part) => tokenize(part.replace(/"/g, "")));

		return {
			type: "AND",
			terms,
			includeTerms: terms,
			excludeTerms: [],
			originalQuery: queryString
		};
	}

	// Simple phrase query
	const terms = tokenize(trimmed.replace(/"/g, ""));

	return {
		type: "PHRASE",
		terms,
		includeTerms: terms,
		excludeTerms: [],
		originalQuery: queryString
	};
};

/**
 * Find documents matching query terms
 * @param {string[]} includeTerms - Terms that must be present
 * @param {string[]} excludeTerms - Terms that must NOT be present
 * @returns {Promise<Set>} Set of matching document IDs
 */
export const findMatchingDocuments = async (
	includeTerms,
	excludeTerms = []
) => {
	try {
		if (includeTerms.length === 0) {
			return new Set();
		}

		// Get documents containing any of the include terms
		const includeResult = await query(
			`SELECT DISTINCT doc_id 
       FROM positional_index 
       WHERE term = ANY($1)`,
			[includeTerms]
		);

		// Group by document to check if ALL terms are present
		const termCountResult = await query(
			`SELECT doc_id, COUNT(DISTINCT term) as term_count
       FROM positional_index 
       WHERE term = ANY($1)
       GROUP BY doc_id`,
			[includeTerms]
		);

		// Filter documents that contain ALL include terms
		const matchingDocs = new Set(
			termCountResult.rows
				.filter((row) => parseInt(row.term_count) === includeTerms.length)
				.map((row) => row.doc_id)
		);

		// Exclude documents containing exclude terms
		if (excludeTerms.length > 0) {
			const excludeResult = await query(
				`SELECT DISTINCT doc_id 
         FROM positional_index 
         WHERE term = ANY($1)`,
				[excludeTerms]
			);

			for (const row of excludeResult.rows) {
				matchingDocs.delete(row.doc_id);
			}
		}

		return matchingDocs;
	} catch (error) {
		console.error("Error finding matching documents:", error);
		throw error;
	}
};

/**
 * Calculate cosine similarity between query and document
 * @param {Object} queryVector - Query TF-IDF vector
 * @param {Object} docVector - Document TF-IDF vector
 * @returns {number} Cosine similarity score
 */
export const calculateCosineSimilarity = (queryVector, docVector) => {
	let dotProduct = 0;
	let queryMagnitude = 0;
	let docMagnitude = 0;

	// Calculate dot product and magnitudes
	const allTerms = new Set([
		...Object.keys(queryVector),
		...Object.keys(docVector)
	]);

	for (const term of allTerms) {
		const queryValue = queryVector[term] || 0;
		const docValue = docVector[term] || 0;

		dotProduct += queryValue * docValue;
		queryMagnitude += queryValue * queryValue;
		docMagnitude += docValue * docValue;
	}

	queryMagnitude = Math.sqrt(queryMagnitude);
	docMagnitude = Math.sqrt(docMagnitude);

	// Avoid division by zero
	if (queryMagnitude === 0 || docMagnitude === 0) {
		return 0;
	}

	return dotProduct / (queryMagnitude * docMagnitude);
};

/**
 * Create query TF-IDF vector
 * @param {string[]} queryTerms - Tokenized query terms
 * @param {Object} idf - IDF values for all terms
 * @returns {Object} Query TF-IDF vector
 */
export const createQueryVector = (queryTerms, idf) => {
	const queryVector = {};
	const termFrequency = {};

	// Calculate term frequency in query
	for (const term of queryTerms) {
		termFrequency[term] = (termFrequency[term] || 0) + 1;
	}

	// Calculate TF-IDF for query terms
	for (const term in termFrequency) {
		const freq = termFrequency[term];
		const tf = freq > 0 ? 1 + Math.log10(freq) : 0;
		const idfValue = idf[term] || 0;

		queryVector[term] = tf * idfValue;
	}

	return queryVector;
};

/**
 * Process search query and return ranked results
 * @param {string} queryString - Search query
 * @returns {Promise<Array>} Ranked search results
 */
export const processQuery = async (queryString) => {
	try {
		// Parse query
		const parsedQuery = parseQuery(queryString);
		const { type, includeTerms, excludeTerms } = parsedQuery;

		// Find matching documents
		const matchingDocIds = await findMatchingDocuments(
			includeTerms,
			excludeTerms
		);

		if (matchingDocIds.size === 0) {
			return [];
		}

		// Get normalized TF-IDF matrix
		const { matrix: tfidfMatrix } = await calculateNormalizedTFIDF();
		const { idf } = await calculateIDF();

		// Create query vector
		const queryVector = createQueryVector(includeTerms, idf);

		// Calculate similarity scores
		const results = [];

		for (const docId of matchingDocIds) {
			// Build document vector from TF-IDF matrix
			const docVector = {};
			for (const term in tfidfMatrix) {
				if (tfidfMatrix[term][docId]) {
					docVector[term] = tfidfMatrix[term][docId];
				}
			}

			// Calculate cosine similarity
			const similarity = calculateCosineSimilarity(queryVector, docVector);

			// Get document details
			const docResult = await query(
				`SELECT doc_id, filename, encrypted_content, iv, auth_tag, word_count 
         FROM documents WHERE doc_id = $1`,
				[docId]
			);

			if (docResult.rows.length > 0) {
				const doc = docResult.rows[0];
				let content;
				try {
					content = decryptDocument(
						doc.encrypted_content,
						doc.iv,
						doc.auth_tag
					);
				} catch (decryptError) {
					console.error(
						"Error decrypting document for search results:",
						decryptError
					);
					continue;
				}

				// Generate snippet with highlighted terms
				const snippet = generateSnippet(content, includeTerms, 200);

				results.push({
					doc_id: doc.doc_id,
					filename: doc.filename,
					similarity: parseFloat(similarity.toFixed(4)),
					snippet,
					word_count: doc.word_count,
					matched_terms: includeTerms.filter((term) =>
						content.toLowerCase().includes(term)
					)
				});
			}
		}

		// Sort by similarity score (descending)
		results.sort((a, b) => b.similarity - a.similarity);

		return results;
	} catch (error) {
		console.error("Error processing query:", error);
		throw error;
	}
};
