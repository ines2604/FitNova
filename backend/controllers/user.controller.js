const userModel = require("../models/user.model");

// GET /api/users/me — profil de l'utilisateur connecté
const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/users/me — mise à jour du profil
const updateMe = async (req, res) => {
  try {
    const { fullName } = req.body;
    const currentUser = await userModel.findById(req.user.id);

    await userModel.updateProfile(req.user.id, {
      fullName,
      profilePhoto: currentUser.profile_photo,
    });

    const updatedUser = await userModel.findById(req.user.id);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/users/me/photo — mise à jour de la photo de profil (via multer)
const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier envoyé" });
    }

    const currentUser = await userModel.findById(req.user.id);
    const photoPath = `/uploads/${req.file.filename}`;

    await userModel.updateProfile(req.user.id, {
      fullName: currentUser.full_name,
      profilePhoto: photoPath,
    });

    res.status(200).json({ message: "Photo mise à jour", profilePhoto: photoPath });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getMe,
  updateMe,
  updateProfilePhoto,
};