# Vector Database Implementation

This module provides a modular implementation for vector databases, starting with Pinecone and designed to be extendable to other providers.

## Usage

### Basic Example

```typescript
import { getVectorDb } from "@/lib/vectordb";

// Store data in the vector database
async function storeData() {
  const vectorDb = await getVectorDb();
  const result = await vectorDb.upsert(
    {
      botId: "bot_123",
      documentId: "doc456",
    },
    "This is some text that will be embedded and stored in the vector database."
  );

  console.log("Store result:", result);
}

// Query data from the vector database
async function queryData() {
  const vectorDb = await getVectorDb();
  const results = await vectorDb.query(
    { botId: "user123" },
    "Find text similar to this query",
    5 // top K results
  );

  console.log("Query results:", results);
}

// Delete data from the vector database
async function deleteData() {
  const vectorDb = await getVectorDb();
  const result = await vectorDb.deleteByFilter({ documentId: "doc456" });
  console.log("Delete result:", result);
}
```

### Using Server Actions

See `example.ts` for complete examples of using the vector database with server actions.

### Document Tracking in Chat

To track which documents were used in a chat response:

1. Make sure to include `documentId` in the metadata when storing documents:

```typescript
await vectorDb.upsert(
  {
    documentId: knowledgeFile.id, // Important for tracking
    botId: botId,
    namespace: `kb-${knowledgeBaseId}`,
  },
  documentText
);
```

2. When querying for context in a chat, extract the document IDs and their relevance scores:

```typescript
// Current workaround: Extract document IDs and scores from content
// Format like "[docId:abc123|score:0.87]" in the text chunks
const usedDocuments = [];

for (const chunk of contextResults) {
  const docMatch = chunk.match(
    /\[docId:([a-zA-Z0-9-]+)(?:\|score:([\d.]+))?\]/
  );
  if (docMatch) {
    const documentId = docMatch[1];
    const score = docMatch[2] ? parseFloat(docMatch[2]) : 1.0;

    usedDocuments.push({
      documentId,
      score,
    });
  }
}
```

3. Store just the document references in `contextUsed` when adding a message:

```typescript
addMessage({
  // ...other message data
  contextUsed: {
    documents: usedDocuments,
    hasKnowledgeContext: usedDocuments.length > 0,
  },
});
```

## Configuration

### Environment Variables

- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_INDEX`: Name of the Pinecone index to use
- `VECTOR_DB_PROVIDER`: Vector database provider to use (defaults to "pinecone")
- `OPENAI_API_KEY`: OpenAI API key for generating embeddings

### Custom Configuration

```typescript
import { getVectorDb } from "@/lib/vectordb";

const vectorDb = await getVectorDb({
  indexName: "custom-index",
  namespace: "custom-namespace",
  dimensions: 1536, // OpenAI dimensions
  chunkSize: 1000,
  chunkOverlap: 50,
  upsertBatchSize: 50,
  topK: 10,
  minScore: 0.7,
});
```

## Architecture

The system is designed to be modular:

- `index.ts`: Main interface and factory methods
- `types.ts`: Common type definitions
- `utils.ts`: Shared utilities
- `embedding/`: Embedding providers
- `providers/`: Vector database implementations

### Adding New Providers

1. Create a new directory under `providers/`
2. Implement the `VectorDbService` interface
3. Update the `VectorDbFactory` in `index.ts`

## Dependencies

- `@pinecone-database/pinecone`: Pinecone client
- `@pinecone-database/doc-splitter`: For text splitting
- `openai`: For generating embeddings
- `md5`: For hashing document content
- `zod`: For type validation
