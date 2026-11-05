# Retrieval smoke evaluation

Generated: 2026-11-05T05:20:52.795Z

Model: Xenova/multilingual-e5-small, q8. Hybrid BM25 + vector, top 5, BNS only. These four examples are developer-labelled, not a lawyer-reviewed benchmark.

Expected section appeared in **3/4** results.

- Query: Someone stole my mobile phone
  - Expected section: 303; returned: 356, 303, 356, 59, 309; HIT

- Query: मेरा मोबाइल फोन चोरी हो गया
  - Expected section: 303; returned: 303, 309, 303, 212, 51; HIT

- Query: मेरे साथ धोखाधड़ी हुई है
  - Expected section: 318; returned: 212, 335, 111, 314, 309; MISS

- Query: Someone threatened to kill me
  - Expected section: 351; returned: 351, 101, 100, 3, 113; HIT

The pipeline is operational, but these results do not establish reliable multilingual legal retrieval. Related offences may be relevant but do not substitute for the expected provision. Add reviewed examples, improve retrieval and reranking, and measure results before public use. Exact section-number requests should use the sectionNumber filter. Similarity scores are not answer confidence.
