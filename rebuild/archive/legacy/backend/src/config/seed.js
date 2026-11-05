import Advocate from "../models/Advocate.js";

const defaultAdvocates = [
  {
    name: "Aditi Sharma",
    expertise: ["family", "civil"],
    rating: 4.8,
    experienceYears: 9,
    availability: true,
    languages: ["Hindi", "English"]
  },
  {
    name: "Rahul Mehta",
    expertise: ["criminal", "property"],
    rating: 4.7,
    experienceYears: 11,
    availability: true,
    languages: ["Hindi", "English"]
  },
  {
    name: "Sneha Verma",
    expertise: ["civil", "property"],
    rating: 4.6,
    experienceYears: 8,
    availability: true,
    languages: ["English"]
  }
];

export const seedAdvocatesIfEmpty = async () => {
  const count = await Advocate.countDocuments();
  if (count === 0) {
    await Advocate.insertMany(defaultAdvocates);
    console.log("Seeded default advocates");
  }
};
