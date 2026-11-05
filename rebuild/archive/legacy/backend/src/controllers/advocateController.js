import Advocate from "../models/Advocate.js";
import { normalizeLegalDomainForMatch } from "../utils/legalDomain.js";

export const matchAdvocates = async (req, res, next) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ message: "domain is required" });
    }

    const canonical = normalizeLegalDomainForMatch(domain);

    const advocates = await Advocate.find({
      expertise: canonical,
      availability: true
    })
      .sort({ rating: -1 })
      .limit(5);

    res.json({ advocates });
  } catch (error) {
    next(error);
  }
};
