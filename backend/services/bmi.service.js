// Calcule l'IMC : poids (kg) / taille (m)²
const calculateBmi = (weightKg, heightCm) => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 100) / 100;
};

// Détermine la catégorie selon l'IMC (seuils OMS)
const getBmiCategory = (bmi) => {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
};

module.exports = { calculateBmi, getBmiCategory };