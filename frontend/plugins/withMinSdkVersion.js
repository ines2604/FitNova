const { withProjectBuildGradle } = require("@expo/config-plugins");

module.exports = function withMinSdkVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Expo utilise rootProject.ext.minSdkVersion.
    // On définit explicitement cette valeur à 26.
    if (contents.includes("ext {")) {
      contents = contents.replace(
        "ext {",
        `ext {
    minSdkVersion = 26`
      );
    } else {
      // Sécurité : si le bloc ext n'existe pas,
      // on le crée avant les plugins Expo.
      contents = contents.replace(
        /apply plugin:/,
        `ext {
    minSdkVersion = 26
}

apply plugin:`
      );
    }

    config.modResults.contents = contents;

    return config;
  });
};