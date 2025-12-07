import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

/**
 * Check if Spark container is running
 */
export const checkSparkContainer = async () => {
	try {
		const { stdout } = await execPromise(
			'docker ps --filter "name=spark-local" --format "{{.Names}}"'
		);
		return stdout.trim() === "spark-local";
	} catch (error) {
		console.error("Error checking Spark container:", error);
		return false;
	}
};

/**
 * Install required Python packages in Spark container
 */
export const installSparkDependencies = async () => {
	try {
		console.log(
			"Installing Python dependencies in Spark container (psycopg2-binary, pycryptodome)..."
		);
		await execPromise(
			"docker exec spark-local pip install --quiet --no-cache-dir psycopg2-binary pycryptodome"
		);
		console.log("✅ Dependencies installed successfully");
		return true;
	} catch (error) {
		console.error("Error installing dependencies:", error);
		throw new Error("Failed to install Spark dependencies: " + error.message);
	}
};

/**
 * Build positional index using Spark
 * Triggers the Spark job to process documents and build the index
 */
export const buildPositionalIndex = async () => {
	try {
		// Check if Spark container is running
		const isRunning = await checkSparkContainer();
		if (!isRunning) {
			throw new Error(
				"Spark container is not running. Please start it with docker-compose up -d"
			);
		}

		// Install dependencies (psycopg2 for PostgreSQL connection)
		await installSparkDependencies();

		console.log("Submitting Spark job to build positional index...");

		// Submit Spark job (use full path for Apache Spark image)
		const { stdout, stderr } = await execPromise(
			"docker exec spark-local /opt/spark/bin/spark-submit --master local[*] /app/positional_index.py",
			{ maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
		);

		console.log("Spark job output:", stdout);
		if (stderr) {
			console.error("Spark job errors:", stderr);
		}

		console.log("✅ Positional index built successfully");

		return {
			success: true,
			output: stdout,
			errors: stderr
		};
	} catch (error) {
		console.error("Error building positional index:", error);
		throw new Error("Failed to build positional index: " + error.message);
	}
};

/**
 * Get Spark job status
 */
export const getSparkStatus = async () => {
	try {
		const isRunning = await checkSparkContainer();

		if (!isRunning) {
			return {
				status: "stopped",
				message: "Spark container is not running"
			};
		}

		return {
			status: "running",
			message: "Spark container is running"
		};
	} catch (error) {
		return {
			status: "error",
			message: error.message
		};
	}
};
