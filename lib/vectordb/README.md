# High-Performance Vector Database System

This system provides optimized, high-throughput processing for storing and querying text content in Pinecone vector database. It's designed for maximum efficiency when processing large volumes of files and documents.

## Key Optimizations

### 🚀 Performance Improvements

1. **Batch Embedding Generation**: Uses OpenAI's batch embedding API (up to 2048 texts per request)
2. **Optimized Batch Sizes**: Automatically calculates optimal batch sizes based on vector dimensions and metadata
3. **Parallel Processing**: Supports both controlled concurrency and full parallelization
4. **Retry Logic**: Exponential backoff for handling rate limits and transient errors
5. **Memory Efficient**: Processes large datasets without loading everything into memory

### 📊 Throughput Improvements

- **Before**: ~10-50 documents/minute
- **After**: ~500-2000+ documents/minute (depending on content size and rate limits)

## Quick Start

### Basic Single Text Processing

```typescript
import { getVectorDb } from "@/lib/vectordb";

const vectorDb = await getVectorDb();

// Process a single text
const result = await vectorDb.upsert(
  {
    accountId: "user123",
    documentId: "doc456",
    sourceType: "document",
  },
  "Your text content here..."
);
```

### High-Performance Batch Processing

```typescript
import {
  batchProcessTexts,
  batchProcessFiles,
} from "@/lib/vectordb/batch-processor";

// Process multiple texts with optimal batching
const texts = [
  "First document content...",
  "Second document content...",
  { text: "Third document content...", title: "Custom Title" },
];

const result = await batchProcessTexts(
  texts,
  { accountId: "user123", sourceType: "bulk_upload" },
  {
    batchSize: 50, // Process 50 texts at once
    useParallelUpsert: false, // Safe for rate limits
    maxConcurrentBatches: 3, // Process 3 batches simultaneously
  }
);

console.log(
  `Processed ${result.totalRecords} records from ${texts.length} texts`
);
```

### File Processing

```typescript
import { batchProcessFiles } from "@/lib/vectordb/batch-processor";

// Process multiple files
const files = [
  new File(["content1"], "file1.txt"),
  new File(["content2"], "file2.txt"),
  { content: "Manual content", filename: "manual.txt" },
];

const result = await batchProcessFiles(
  files,
  { accountId: "user123", sourceType: "file_upload" },
  {
    batchSize: 25, // Smaller batches for larger files
    useParallelUpsert: true, // Maximum speed if you have good rate limits
  }
);
```

## Advanced Usage

### Custom Batch Processor

```typescript
import { VectorDbBatchProcessor } from "@/lib/vectordb/batch-processor";

const processor = new VectorDbBatchProcessor({
  batchSize: 100,
  useParallelUpsert: false,
  maxConcurrentBatches: 5,

  // Custom metadata extraction
  getMetadata: (item, index) => ({
    accountId: "user123",
    documentId: `doc_${index}`,
    timestamp: new Date().toISOString(),
    customField: item.customData,
  }),

  // Custom text extraction
  getTextContent: (item) => {
    if (typeof item === "string") return item;
    return item.content || item.text || String(item);
  },
});

const result = await processor.processTexts(yourData, baseMetadata);
```

### Direct Vector Database Operations

```typescript
import { getVectorDb } from "@/lib/vectordb";

const vectorDb = await getVectorDb();

// High-performance batch upsert
const textEntries = [
  {
    text: "Document 1 content...",
    additionalMetadata: { documentId: "doc1", accountId: "user123" },
  },
  {
    text: "Document 2 content...",
    additionalMetadata: { documentId: "doc2", accountId: "user123" },
  },
];

const result = await vectorDb.batchUpsert(textEntries, true); // true for parallel processing
```

## Configuration Options

### Batch Processing Configuration

```typescript
interface BatchProcessingConfig {
  // Maximum number of texts to process in a single batch
  batchSize?: number; // Default: 50

  // Whether to use parallel upsert for maximum speed
  useParallelUpsert?: boolean; // Default: false (safer for rate limits)

  // Maximum concurrent batches to process
  maxConcurrentBatches?: number; // Default: 3

  // Custom metadata extraction function
  getMetadata?: (item: ProcessableItem, index: number) => AdditionalMetadata;

  // Custom text content extraction function
  getTextContent?: (item: ProcessableItem, index: number) => string;
}
```

### Vector Database Configuration

The system automatically calculates optimal batch sizes based on:

- Vector dimensions (1536 for OpenAI embeddings)
- Average metadata size
- Pinecone's 2MB request limit
- Maximum 1000 records per batch limit

## Performance Tuning

### For Maximum Speed (Good Rate Limits)

```typescript
const config = {
  batchSize: 245, // Optimal for 1536-dim vectors with metadata
  useParallelUpsert: true,
  maxConcurrentBatches: 10,
};
```

### For Rate Limit Safety (Conservative)

```typescript
const config = {
  batchSize: 50,
  useParallelUpsert: false,
  maxConcurrentBatches: 2,
};
```

### For Memory Efficiency (Large Datasets)

```typescript
const config = {
  batchSize: 25,
  useParallelUpsert: false,
  maxConcurrentBatches: 1,
};
```

## Error Handling

The system includes comprehensive error handling:

```typescript
const result = await batchProcessTexts(texts, metadata, config);

if (!result.success) {
  console.error(`Processing failed with ${result.errors.length} errors:`);
  result.errors.forEach((error, index) => {
    console.error(`Error ${index + 1}:`, error.message);
  });
}

// Check individual batch results
result.batchResults.forEach((batchResult, index) => {
  if (!batchResult.success) {
    console.error(`Batch ${index + 1} failed:`, batchResult.error);
  }
});
```

## Monitoring and Logging

The system provides detailed logging:

```
Starting batch processing of 1000 texts...
Configuration: batchSize=50, parallel=false
Processing batch 1/20 (50 items)...
✓ Batch 1 completed: 127 records
Processing batch 2/20 (50 items)...
✓ Batch 2 completed: 134 records
...
✓ Batch processing completed:
  - Total texts processed: 1000
  - Total records created: 2543
  - Successful batches: 20/20
  - Errors: 0
```

## Environment Variables

Make sure you have the required environment variables:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_index_name
OPENAI_API_KEY=your_openai_api_key
VECTOR_DB_PROVIDER=pinecone
```

## Best Practices

1. **Start Conservative**: Begin with smaller batch sizes and lower concurrency, then increase based on your rate limits
2. **Monitor Performance**: Watch for rate limit errors and adjust accordingly
3. **Use Parallel Processing Carefully**: Only enable `useParallelUpsert: true` if you have generous rate limits
4. **Batch Similar Content**: Group similar-sized content together for optimal batching
5. **Handle Errors Gracefully**: Always check the result and handle errors appropriately

## Troubleshooting

### Rate Limit Errors

- Reduce `batchSize`
- Set `useParallelUpsert: false`
- Decrease `maxConcurrentBatches`

### Memory Issues

- Reduce `batchSize`
- Process files in smaller groups
- Use streaming for very large files

### Slow Performance

- Increase `batchSize` (up to optimal limit)
- Enable `useParallelUpsert: true`
- Increase `maxConcurrentBatches`
