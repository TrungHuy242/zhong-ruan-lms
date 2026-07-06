const userRepository = require("./user.repository");

async function getAllUsers() {
  return userRepository.findAllUsers();
}

module.exports = {
  getAllUsers,
};