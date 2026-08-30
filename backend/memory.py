from mem0 import Memory

config = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "orion-brain",
            "temperature": 0,
            "max_tokens": 1500,
        }
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "nomic-embed-text",
            "embedding_dims": 768
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "orion_memory",
            "embedding_model_dims": 768,
            "path": "C:/Users/proud/ORION/data/qdrant"
        }
    }
}


m = Memory.from_config(config)

def test_memory():
    print("Saving Memory...")
    m.add("I need to study unit 2 for 3 hours this Friday", user_id="karna")

    print("Searching for study plans...")
    results = m.search("What are my academic goals for this week?", filters={"user_id": "karna"})

    print("Search Results:")
    print(results)

if __name__ == "__main__":
    test_memory()