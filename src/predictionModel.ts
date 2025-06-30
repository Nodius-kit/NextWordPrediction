export type PredictionModelLanguages = "en"

/**
 * Interface for storing word/sentence mappings with their frequencies
 */
interface PredictionMapping {
    [key: string]: { [next: string]: number };
}

/**
 * Interface for storing prefix to full word mappings
 */
interface CompletionMapping {
    [prefix: string]: string[];
}

/**
 * Interface for performance metrics
 */
interface PerformanceMetrics {
    initializationTime: number;
    preprocessingTimes: {
        sentences: number;
        words: number;
        completions: number;
    };
    memoryUsage: {
        wordPredictions: number;
        sentencePredictions: number;
        wordCompletions: number;
        uniqueWords: number;
        total: number;
    };
    dataStats: {
        uniqueWordsCount: number;
        wordPredictionsCount: number;
        sentencePredictionsCount: number;
        completionPrefixesCount: number;
    };
}

/**
 * Interface for prediction results with confidence scores
 */
interface PredictionResult {
    word: string;
    confidence: number;
    frequency: number;
}

/**
 * Interface for completion results with confidence scores
 */
interface CompletionResult {
    word: string;
    confidence: number;
    prefixMatch: number; // How much of the word matches the prefix (0-1)
}

export class PredictionModel {

    language: PredictionModelLanguages = "en";
    #initialized: boolean = false;
    #debug: boolean = false;
    #path:string = "src";
    #metrics: PerformanceMetrics = {
        initializationTime: 0,
        preprocessingTimes: {
            sentences: 0,
            words: 0,
            completions: 0
        },
        memoryUsage: {
            wordPredictions: 0,
            sentencePredictions: 0,
            wordCompletions: 0,
            uniqueWords: 0,
            total: 0
        },
        dataStats: {
            uniqueWordsCount: 0,
            wordPredictionsCount: 0,
            sentencePredictionsCount: 0,
            completionPrefixesCount: 0
        }
    };

    #wordPredictions: PredictionMapping = {};
    #sentencePredictions: PredictionMapping = {};
    #wordCompletions: CompletionMapping = {};
    #uniqueWords: Set<string> = new Set();

    constructor(config?:{path?:string, debug?:boolean}) {
        this.#path = config?.path ?? "src";
        this.#debug = config?.debug ?? false;
        if (this.#debug) {
            console.log('🔍 PredictionModel Debug Mode: ENABLED');
        }
    }

    /**
     * Initializes the prediction model with the specified language
     * Loads and preprocesses language data files
     */
    async initialize(language?: PredictionModelLanguages): Promise<void> {
        const startTime = performance.now();

        if (language) {
            this.language = language;
        }

        try {
            if (this.#debug) {
                console.log(`📚 Initializing PredictionModel with language: ${this.language}`);
            }

            // Load language data files
            const loadStartTime = performance.now();
            const [paragraphsData, wordsData] = await Promise.all([
                this.loadLanguageFile('paragraphs.txt'),
                this.loadLanguageFile('words.txt')
            ]);
            const loadEndTime = performance.now();

            if (this.#debug) {
                console.log(`⏱️  File loading time: ${(loadEndTime - loadStartTime).toFixed(2)}ms`);
                console.log(`📄 Paragraphs data size: ${this.formatBytes(new Blob([paragraphsData]).size)}`);
                console.log(`📄 Words data size: ${this.formatBytes(new Blob([wordsData]).size)}`);
            }

            // Preprocess the data
            await this.preprocessSentenceData(paragraphsData);
            await this.preprocessWordData(wordsData);

            this.#initialized = true;

            const endTime = performance.now();
            this.#metrics.initializationTime = endTime - startTime;

            if (this.#debug) {
                this.calculateMemoryUsage();
                this.logPerformanceMetrics();
            }
        } catch (error) {
            throw new Error(`Failed to initialize prediction model: ${error}`);
        }
    }

    /**
     * Loads a language file from the language-pack directory
     */
    private async loadLanguageFile(filename: string): Promise<string> {
        const path = `${this.#path}/language-pack/${this.language}/${filename}`;

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Error loading language file ${filename}: ${error}`);
        }
    }

    /**
     * Preprocesses paragraph data to build sentence-to-sentence prediction mappings
     */
    private async preprocessSentenceData(paragraphsData: string): Promise<void> {
        const startTime = performance.now();

        // Clean and tokenize sentences
        const sentences = paragraphsData
            .toLowerCase()
            .replace(/\n/g, ' ')
            .split(' ')
            .filter(word => word.trim() !== '');

        if (this.#debug) {
            console.log(`🔤 Processing ${sentences.length} sentence tokens...`);
        }

        // Build prediction mappings for next word prediction
        this.#sentencePredictions = this.buildPredictionMapping(sentences);

        const endTime = performance.now();
        this.#metrics.preprocessingTimes.sentences = endTime - startTime;
        this.#metrics.dataStats.sentencePredictionsCount = Object.keys(this.#sentencePredictions).length;

        if (this.#debug) {
            console.log(`✅ Sentence preprocessing completed in ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`   - Unique sentence predictions: ${this.#metrics.dataStats.sentencePredictionsCount}`);
        }
    }

    /**
     * Preprocesses word data to build word completion mappings
     */
    private async preprocessWordData(wordsData: string): Promise<void> {
        const startTime = performance.now();

        const words = wordsData
            .toLowerCase()
            .replace(/\n/g, ' ')
            .split(' ')
            .filter(word => word.trim() !== '');

        if (this.#debug) {
            console.log(`🔤 Processing ${words.length} word tokens...`);
        }

        // Store unique words
        words.forEach(word => {
            this.#uniqueWords.add(word);
        });

        this.#metrics.dataStats.uniqueWordsCount = this.#uniqueWords.size;

        // Build completion mappings (prefix -> full words)
        const completionStartTime = performance.now();
        this.buildCompletionMappings();
        const completionEndTime = performance.now();
        this.#metrics.preprocessingTimes.completions = completionEndTime - completionStartTime;

        // Build word-to-word prediction mappings for the actual words
        this.#wordPredictions = this.buildPredictionMapping(words);

        const endTime = performance.now();
        this.#metrics.preprocessingTimes.words = endTime - startTime;
        this.#metrics.dataStats.wordPredictionsCount = Object.keys(this.#wordPredictions).length;

        if (this.#debug) {
            console.log(`✅ Word preprocessing completed in ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`   - Unique words: ${this.#metrics.dataStats.uniqueWordsCount}`);
            console.log(`   - Word predictions: ${this.#metrics.dataStats.wordPredictionsCount}`);
            console.log(`   - Completion mapping time: ${this.#metrics.preprocessingTimes.completions.toFixed(2)}ms`);
        }
    }

    /**
     * Builds mappings from prefixes to full words
     */
    private buildCompletionMappings(): void {
        this.#wordCompletions = {};

        // For each unique word
        this.#uniqueWords.forEach(word => {
            // Create entries for all prefixes of this word
            for (let i = 1; i <= word.length; i++) {
                const prefix = word.slice(0, i);

                if (!this.#wordCompletions[prefix]) {
                    this.#wordCompletions[prefix] = [];
                }

                // Only add the full word if it's not already there
                if (!this.#wordCompletions[prefix].includes(word)) {
                    this.#wordCompletions[prefix].push(word);
                }
            }
        });

        // Sort completions by frequency (you could enhance this with frequency data)
        Object.keys(this.#wordCompletions).forEach(prefix => {
            this.#wordCompletions[prefix].sort();
        });

        this.#metrics.dataStats.completionPrefixesCount = Object.keys(this.#wordCompletions).length;
    }

    /**
     * Builds prediction mapping from array of tokens
     * Maps each token to the tokens that follow it with their frequencies
     */
    private buildPredictionMapping(tokens: string[]): PredictionMapping {
        const mapping: PredictionMapping = {};

        for (let i = 0; i < tokens.length - 1; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];

            if (!mapping[current]) {
                mapping[current] = {};
            }

            if (!mapping[current][next]) {
                mapping[current][next] = 0;
            }

            mapping[current][next]++;
        }

        return mapping;
    }

    /**
     * Predicts next words based on input
     * Returns array of predicted words sorted by frequency
     */
    predict(input: string): string[] {
        const startTime = performance.now();

        if (!this.#initialized) {
            throw new Error('Prediction model not initialized. Call initialize() first.');
        }

        const cleanInput = input.toLowerCase().trim();
        const predictions = this.#sentencePredictions[cleanInput];

        if (!predictions) {
            if (this.#debug) {
                const endTime = performance.now();
                console.log(`🔮 Prediction for "${input}" - No results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
            }
            return [];
        }

        const results = this.getSortedPredictions(predictions);

        if (this.#debug) {
            const endTime = performance.now();
            console.log(`🔮 Prediction for "${input}" - ${results.length} results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
        }

        return results;
    }

    /**
     * Predicts next words with confidence scores
     * Returns array of prediction results with confidence values
     */
    predictWithConfidence(input: string): PredictionResult[] {
        const startTime = performance.now();

        if (!this.#initialized) {
            throw new Error('Prediction model not initialized. Call initialize() first.');
        }

        const cleanInput = input.toLowerCase().trim();
        const predictions = this.#sentencePredictions[cleanInput];

        if (!predictions) {
            if (this.#debug) {
                const endTime = performance.now();
                console.log(`🔮 Prediction for "${input}" - No results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
            }
            return [];
        }

        const results = this.getSortedPredictionsWithConfidence(predictions);

        if (this.#debug) {
            const endTime = performance.now();
            console.log(`🔮 Prediction with confidence for "${input}" - ${results.length} results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
            if (results.length > 0) {
                console.log(`   Top 3: ${results.slice(0, 3).map(r => `${r.word} (${(r.confidence * 100).toFixed(1)}%)`).join(', ')}`);
            }
        }

        return results;
    }

    /**
     * Completes partial words based on input
     * Returns array of possible completions
     */
    complete(input: string): string[] {
        const startTime = performance.now();

        if (!this.#initialized) {
            throw new Error('Prediction model not initialized. Call initialize() first.');
        }

        const cleanInput = input.toLowerCase().trim();

        // Get all words that start with this prefix
        const completions = this.#wordCompletions[cleanInput] || [];

        // Return up to 15 completions
        const results = completions.slice(0, 15);

        if (this.#debug) {
            const endTime = performance.now();
            console.log(`📝 Completion for "${input}" - ${results.length} results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
        }

        return results;
    }

    /**
     * Completes partial words with confidence scores
     * Returns array of completion results with confidence values
     */
    completeWithConfidence(input: string): CompletionResult[] {
        const startTime = performance.now();

        if (!this.#initialized) {
            throw new Error('Prediction model not initialized. Call initialize() first.');
        }

        const cleanInput = input.toLowerCase().trim();

        // Get all words that start with this prefix
        const completions = this.#wordCompletions[cleanInput] || [];

        // Calculate confidence based on multiple factors
        const results: CompletionResult[] = completions.slice(0, 15).map(word => {
            // Calculate prefix match ratio
            const prefixMatch = parseFloat((cleanInput.length / word.length).toFixed(2));

            // Check if this word appears in predictions (frequency indicator)
            const wordFrequency = this.getWordFrequency(word);

            // Calculate confidence based on:
            // 1. How much of the word is already typed (prefix match)
            // 2. Word frequency in the corpus
            // 3. Word length (shorter words tend to be more common)
            const lengthFactor = Math.max(0, 1 - (word.length - 5) / 10); // Favor words 5 chars or less
            const frequencyFactor = Math.min(1, wordFrequency / 100); // Normalize frequency

            // Weighted confidence calculation
            const confidence = (prefixMatch * 0.4) + (frequencyFactor * 0.4) + (lengthFactor * 0.2);

            return {
                word,
                confidence: parseFloat(Math.min(1, Math.max(0, confidence)).toFixed(2)), // Ensure 0-1 range
                prefixMatch
            };
        });

        // Sort by confidence
        results.sort((a, b) => b.confidence - a.confidence);

        if (this.#debug) {
            const endTime = performance.now();
            console.log(`📝 Completion with confidence for "${input}" - ${results.length} results (${((endTime - startTime) * 1000).toFixed(0)}μs)`);
            if (results.length > 0) {
                console.log(`   Top 3: ${results.slice(0, 3).map(r => `${r.word} (${(r.confidence * 100).toFixed(1)}%)`).join(', ')}`);
            }
        }

        return results;
    }

    /**
     * Gets the frequency of a word in the corpus
     */
    private getWordFrequency(word: string): number {
        let frequency = 0;

        // Check in word predictions
        if (this.#wordPredictions[word]) {
            frequency += Object.values(this.#wordPredictions[word]).reduce((sum, freq) => sum + freq, 0);
        }

        // Check as a next word in predictions
        Object.values(this.#wordPredictions).forEach(predictions => {
            if (predictions[word]) {
                frequency += predictions[word];
            }
        });

        return frequency;
    }

    /**
     * Sorts predictions by frequency and returns top results
     */
    private getSortedPredictions(predictions: { [next: string]: number }, limit: number = 15): string[] {
        return Object.entries(predictions)
            .sort(([, freqA], [, freqB]) => freqB - freqA)
            .slice(0, limit)
            .map(([word]) => word);
    }

    /**
     * Sorts predictions by frequency and returns results with confidence scores
     */
    private getSortedPredictionsWithConfidence(predictions: { [next: string]: number }, limit: number = 15): PredictionResult[] {
        // Calculate total frequency for normalization
        const totalFrequency = Object.values(predictions).reduce((sum, freq) => sum + freq, 0);

        // Convert to results with confidence
        const results: PredictionResult[] = Object.entries(predictions)
            .map(([word, frequency]) => ({
                word,
                frequency,
                confidence: parseFloat((frequency / totalFrequency).toFixed(2)) // Confidence based on relative frequency
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);

        return results;
    }

    /**
     * Checks if the model is initialized
     */
    isInitialized(): boolean {
        return this.#initialized;
    }

    /**
     * Gets the current language
     */
    getLanguage(): PredictionModelLanguages {
        return this.language;
    }

    /**
     * Resets the model (clears all preprocessed data)
     */
    reset(): void {
        if (this.#debug) {
            console.log('🔄 Resetting PredictionModel...');
        }

        this.#initialized = false;
        this.#wordPredictions = {};
        this.#sentencePredictions = {};
        this.#wordCompletions = {};
        this.#uniqueWords.clear();

        // Reset metrics
        this.#metrics = {
            initializationTime: 0,
            preprocessingTimes: {
                sentences: 0,
                words: 0,
                completions: 0
            },
            memoryUsage: {
                wordPredictions: 0,
                sentencePredictions: 0,
                wordCompletions: 0,
                uniqueWords: 0,
                total: 0
            },
            dataStats: {
                uniqueWordsCount: 0,
                wordPredictionsCount: 0,
                sentencePredictionsCount: 0,
                completionPrefixesCount: 0
            }
        };
    }

    /**
     * Calculates approximate memory usage of the model
     */
    private calculateMemoryUsage(): void {
        // Rough estimation of memory usage
        this.#metrics.memoryUsage.wordPredictions = this.estimateObjectSize(this.#wordPredictions);
        this.#metrics.memoryUsage.sentencePredictions = this.estimateObjectSize(this.#sentencePredictions);
        this.#metrics.memoryUsage.wordCompletions = this.estimateObjectSize(this.#wordCompletions);
        this.#metrics.memoryUsage.uniqueWords = this.#uniqueWords.size * 50; // Rough estimate per string

        this.#metrics.memoryUsage.total =
            this.#metrics.memoryUsage.wordPredictions +
            this.#metrics.memoryUsage.sentencePredictions +
            this.#metrics.memoryUsage.wordCompletions +
            this.#metrics.memoryUsage.uniqueWords;
    }

    /**
     * Estimates the size of an object in bytes
     */
    private estimateObjectSize(obj: any): number {
        const jsonStr = JSON.stringify(obj);
        return new Blob([jsonStr]).size;
    }

    /**
     * Formats bytes to human readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Logs comprehensive performance metrics
     */
    private logPerformanceMetrics(): void {
        console.log('\n📊 === PERFORMANCE METRICS ===');
        console.log(`⏱️  Total initialization time: ${this.#metrics.initializationTime.toFixed(2)}ms`);
        console.log('\n⚡ Processing Times:');
        console.log(`   - Sentence preprocessing: ${this.#metrics.preprocessingTimes.sentences.toFixed(2)}ms`);
        console.log(`   - Word preprocessing: ${this.#metrics.preprocessingTimes.words.toFixed(2)}ms`);
        console.log(`   - Completion mappings: ${this.#metrics.preprocessingTimes.completions.toFixed(2)}ms`);

        console.log('\n💾 Memory Usage:');
        console.log(`   - Word predictions: ${this.formatBytes(this.#metrics.memoryUsage.wordPredictions)}`);
        console.log(`   - Sentence predictions: ${this.formatBytes(this.#metrics.memoryUsage.sentencePredictions)}`);
        console.log(`   - Word completions: ${this.formatBytes(this.#metrics.memoryUsage.wordCompletions)}`);
        console.log(`   - Unique words set: ${this.formatBytes(this.#metrics.memoryUsage.uniqueWords)}`);
        console.log(`   - TOTAL: ${this.formatBytes(this.#metrics.memoryUsage.total)}`);

        console.log('\n📈 Data Statistics:');
        console.log(`   - Unique words: ${this.#metrics.dataStats.uniqueWordsCount.toLocaleString()}`);
        console.log(`   - Word prediction entries: ${this.#metrics.dataStats.wordPredictionsCount.toLocaleString()}`);
        console.log(`   - Sentence prediction entries: ${this.#metrics.dataStats.sentencePredictionsCount.toLocaleString()}`);
        console.log(`   - Completion prefixes: ${this.#metrics.dataStats.completionPrefixesCount.toLocaleString()}`);
        console.log('========================\n');
    }

    /**
     * Gets current performance metrics (useful for external monitoring)
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.#metrics };
    }
}