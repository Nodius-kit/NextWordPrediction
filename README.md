# Nodius Next Word Prediction

A high-performance TypeScript library for next word prediction and word completion, part of the **Nodius** project ecosystem. This module provides intelligent text prediction capabilities with confidence scoring and comprehensive debugging features.

## 🚀 Features

- **Next Word Prediction**: Predicts the most likely next words based on input context
- **Word Completion**: Intelligently completes partial words with confidence scoring
- **Confidence Scoring**: Each prediction/completion comes with a confidence score (0-1)
- **Performance Monitoring**: Built-in debug mode with detailed performance metrics
- **Memory Efficient**: Optimized data structures for minimal memory footprint
- **TypeScript Native**: Full type safety and IntelliSense support
- **Language Support**: Currently supports English with extensible architecture

## 📦 Installation

```bash
npm install nodius_next_word_prediction
```

Or using yarn:
```bash
yarn add nodius_next_word_prediction
```

## 🎯 Quick Start

```typescript
import { PredictionModel } from 'nodius_next_word_prediction';

// Initialize the model
const model = new PredictionModel();
await model.initialize('en');

// Get word predictions
const predictions = model.predict("the");
// Result: ["quick", "brown", "lazy", ...]

// Get word completions
const completions = model.complete("qu");
// Result: ["quick", "quite", "question", ...]
```

## 📖 API Reference

### Constructor

```typescript
const model = new PredictionModel(debug?: boolean);
```

- `debug` (optional, default: `false`): Enable detailed performance logging

### Methods

#### `initialize(language?: PredictionModelLanguages): Promise<void>`
Initializes the model with language data files.

```typescript
await model.initialize('en');
```

#### `predict(input: string): string[]`
Returns an array of predicted next words.

```typescript
const words = model.predict("the");
// ["quick", "brown", "fox", ...]
```

#### `predictWithConfidence(input: string): PredictionResult[]`
Returns predictions with confidence scores.

```typescript
const predictions = model.predictWithConfidence("the");
// [
//   { word: "quick", confidence: 0.35, frequency: 42 },
//   { word: "brown", confidence: 0.28, frequency: 34 }
// ]
```

#### `complete(input: string): string[]`
Returns possible word completions.

```typescript
const completions = model.complete("qu");
// ["quick", "quite", "question", ...]
```

#### `completeWithConfidence(input: string): CompletionResult[]`
Returns completions with confidence scores.

```typescript
const completions = model.completeWithConfidence("qu");
// [
//   { word: "quick", confidence: 0.72, prefixMatch: 0.4 },
//   { word: "quite", confidence: 0.68, prefixMatch: 0.4 }
// ]
```

#### `getMetrics(): PerformanceMetrics`
Returns current performance metrics (useful when debug mode is enabled).

```typescript
const metrics = model.getMetrics();
```

#### `reset(): void`
Clears all preprocessed data and resets the model.

```typescript
model.reset();
```

## 🔍 Debug Mode

Enable debug mode to get detailed performance insights:

```typescript
const model = new PredictionModel(true);
await model.initialize('en');
```

Debug mode provides:
- ⏱️ Initialization and processing times
- 💾 Memory usage breakdown
- 📊 Data statistics
- 🔮 Per-operation timing (in microseconds)

Example debug output:
```
🔍 PredictionModel Debug Mode: ENABLED
📚 Initializing PredictionModel with language: en
⏱️  File loading time: 125.34ms
📄 Paragraphs data size: 1.2 MB
📄 Words data size: 856.3 KB
✅ Sentence preprocessing completed in 45.67ms
   - Unique sentence predictions: 5,234
✅ Word preprocessing completed in 89.12ms
   - Unique words: 10,543
   - Word predictions: 8,765

📊 === PERFORMANCE METRICS ===
⏱️  Total initialization time: 215.13ms

💾 Memory Usage:
   - Word predictions: 2.3 MB
   - Sentence predictions: 1.8 MB
   - Word completions: 3.1 MB
   - TOTAL: 7.2 MB
```

## 📊 Confidence Scores

Confidence scores help you make informed decisions about predictions:

- **0.8 - 1.0**: Very high confidence ⭐⭐⭐⭐⭐
- **0.6 - 0.8**: High confidence ⭐⭐⭐⭐
- **0.4 - 0.6**: Medium confidence ⭐⭐⭐
- **0.2 - 0.4**: Low confidence ⭐⭐
- **0.0 - 0.2**: Very low confidence ⭐

### Prediction Confidence
Based on relative frequency of the word following the input.

### Completion Confidence
Calculated using three weighted factors:
- **40%**: Prefix match ratio
- **40%**: Word frequency in corpus
- **20%**: Word length factor

## 📁 Data Files Structure

The model expects language data files in the following structure:
```
src/
└── language-pack/
    └── en/
        ├── paragraphs.txt
        └── words.txt
```

- `paragraphs.txt`: Training corpus for sentence-level predictions
- `words.txt`: Word list for completion suggestions

## 🚀 Performance Optimization

The model is optimized for:
- **Fast lookups**: O(1) hash-based data structures
- **Memory efficiency**: Prefix trees for word completions
- **Minimal preprocessing**: One-time initialization cost
- **Microsecond response times**: Typical predictions < 100μs

## 🛠️ Advanced Usage

### Custom Language Support

To add a new language:
1. Create a new folder in `src/language-pack/`
2. Add `paragraphs.txt` and `words.txt` files
3. Update the `PredictionModelLanguages` type
4. Initialize with your language code

### Integration Example

```typescript
class TextEditor {
  private predictionModel: PredictionModel;
  
  constructor() {
    this.predictionModel = new PredictionModel();
  }
  
  async initialize() {
    await this.predictionModel.initialize('en');
  }
  
  getSuggestions(currentWord: string, previousWord?: string) {
    // Get completions for current partial word
    if (currentWord.length > 0) {
      return this.predictionModel.completeWithConfidence(currentWord)
        .filter(result => result.confidence > 0.5)
        .slice(0, 5);
    }
    
    // Get next word predictions
    if (previousWord) {
      return this.predictionModel.predictWithConfidence(previousWord)
        .filter(result => result.confidence > 0.3)
        .slice(0, 5);
    }
    
    return [];
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📈 Benchmarks

On a modern machine (Apple M1, 16GB RAM):
- Initialization: ~200ms
- Word prediction: ~50μs
- Word completion: ~30μs
- Memory usage: ~7-10MB for English corpus

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Part of the **Nodius** project ecosystem
- Inspired by modern text prediction algorithms
- Built with TypeScript for type safety and developer experience

## 📞 Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/your-org/nodius_next_word_prediction/issues).

---

**Nodius Next Word Prediction** - Intelligent text prediction for the modern web 🚀