const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: "dk2j5g6hz",            // 🔒 string value
  api_key: "448775788164483",         // 🔒 string value
  api_secret: "-eM5c3asneCVhjlp_UjwAMhWxc4",  // 🔒 string value
})

module.exports = cloudinary