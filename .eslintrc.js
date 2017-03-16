
module.exports = {
  "extends": "semistandard",
  "env": {
    "browser": 1,
    "amd": 1,
  },
  "rules": {
    // I'm willing to revert my stance on this, at some point
    "space-before-function-paren": ["error", "never"],

    // holding my ground on this
    "operator-linebreak": ["error", "before"],

    // I'm sorry, it's just simpler to manage
    "comma-dangle": ["error", "always-multiline"],
  }
};
