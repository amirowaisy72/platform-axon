const express = require("express");
const router = express.Router();
const User = require("../models/Users"); // Import the User model
const Product = require("../models/Product");
const Task = require("../models/Task");
const Combo = require("../models/Combo");
const WalletAddress = require("../models/WalletAddress");
const TransactionHistory = require("../models/TransactionHistory");
const DepositWallet = require("../models/DepositWallet");

// Route to create a new user
router.post("/createUser", async (req, res) => {
  try {
    const { username, phone, loginPassword, transactionPassword, gender, inviteCode } = req.body;

    // 0️⃣ Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(201).json({ error: "Another user with this username already exists." });
    }

    // 1️⃣ Check if referral code exists
    const existingUser = await User.findOne({ myinviteCode: inviteCode });
    if (!existingUser) {
      return res.status(201).json({ error: "Invitation code not found." });
    }

    // 2️⃣ Generate a unique 6-character invite code
    let myinviteCode;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    while (true) {
      myinviteCode = Array.from({ length: 6 }, () =>
        characters.charAt(Math.floor(Math.random() * characters.length))
      ).join("");
      const codeExists = await User.findOne({ myinviteCode });
      if (!codeExists) break;
    }

    // 5️⃣ Create new user
    const newUser = new User({
      username,
      phone,
      loginPassword,
      transactionPassword,
      gender,
      myinviteCode,
      refinviteCode: inviteCode,
      profileimage: "none",
      allowWithdrawal: false,
    });

    await newUser.save();

    // 6️⃣ CREATE DEFAULT NOTIFICATION
    newUser.notifications.push({
      message: "Congratulations on creating new account. You've received your welcome bonus.",
      type: "success",
      read: false,
    });

    await newUser.save(); // Save again after adding notification

    // 4️⃣ CREATE TRANSACTION HISTORY (WELCOME CREDIT)
    const transaction = new TransactionHistory({
      userId: newUser._id,
      walletId: null,
      transactionAmount: 25,
      status: "Successful",
      type: "Credit",
    });

    await transaction.save();

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Route to log in an existing user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Check if username exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    // 2️⃣ Compare the password
    if (user.loginPassword !== password) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // 3️⃣ If credentials are valid, return user data
    res.status(200).json({
      message: "Login successful",
      user
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// ✅ Fetch users with pagination and task count
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Fetch users with pagination
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    const usersWithExtras = await Promise.all(
      users.map(async (user) => {

        // ✅ Count tasks
        const numOfTasks = await Task.countDocuments({
          userId: user._id
        });

        // ✅ Find referral user
        let referralUser = null;

        if (user.refinviteCode) {
          referralUser = await User.findOne({
            myinviteCode: user.refinviteCode
          }).select("username");
        }

        return {
          ...user.toObject(),
          NumOfTasks: numOfTasks,
          ReferralName: referralUser ? referralUser.username : null
        };
      })
    );

    res.json({
      page,
      total,
      totalPages: Math.ceil(total / limit),
      users: usersWithExtras
    });

  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({
      error: "Failed to fetch users"
    });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    const pageSize = 10;

    const mongoQuery = {
      $or: [
        { username: { $regex: query, $options: "i" } },
        { phone: { $regex: query } }
      ]
    };

    // Count total matching users
    const total = await User.countDocuments(mongoQuery);

    // Fetch users with pagination
    const users = await User.find(mongoQuery)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const usersWithExtras = await Promise.all(
      users.map(async (user) => {

        // ✅ Count tasks
        const numOfTasks = await Task.countDocuments({
          userId: user._id
        });

        // ✅ Find referral name
        let referralUser = null;

        if (user.refinviteCode) {
          referralUser = await User.findOne({
            myinviteCode: user.refinviteCode
          }).select("username");
        }

        return {
          ...user.toObject(),
          NumOfTasks: numOfTasks,
          ReferralName: referralUser ? referralUser.username : null
        };
      })
    );

    res.json({
      users: usersWithExtras,
      totalPages: Math.ceil(total / pageSize),
      currentPage: Number(page)
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: "Search failed"
    });
  }
});

// ✅ Update User (PUT)
router.put("/updateUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allowedFields = [
      "username",
      "phone",
      "gender",
      "loginPassword",
      "transactionPassword",
      "profileimage",
      "currentVIPLevel",
      "walletBalance",
      "totalBalance",
      "commissionTotal",
      "salary",
      "activeSetTasks",
      "allowWithdrawal",
      "notifications",
      "todayProfit",
      "creditScore",
    ];

    allowedFields.forEach((field) => {
      if (updatedData[field] !== undefined) {
        user[field] = updatedData[field];
      }
    });

    const updatedUser = await user.save();

    // ✅ Transaction create logic
    let transactionRecord = null;

    if (updatedData.transaction !== undefined) {
      transactionRecord = await TransactionHistory.create({
        userId: userId,
        walletId: null,
        transactionAmount: updatedData.transaction,
        status: "Successful",
        type: "Credit",
      });
    }

    // ✅ Handle letClear logic for Combo
    if (Object.hasOwn(updatedData, "letClear") && updatedData.letClear === true) {
      const combo = await Combo.findOne({
        userId: userId,
        status: "pending", // <-- replace "status" with the actual status value you want to target
      }).sort({ createdAt: 1 }); // first document

      if (combo) {
        combo.letClear = true;
        await combo.save();
      }
    }

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ✅ Fetch single user by ID
router.get("/getUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User fetched successfully",
      user,
    });

  } catch (error) {
    console.error("Fetch User Error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Route to submit task and update referrer with 15% commission
router.put("/submitTask/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = req.body; // should contain walletBalance, commission, task updates, etc.

    // 1️⃣ Update user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const allowedFields = [
      "activeSetTasks",
      "walletBalance",
      "commissionTotal",
      "todayProfit",
      "taskCommission",
    ];
    allowedFields.forEach((field) => {
      if (updatedData[field] !== undefined) {
        user[field] = updatedData[field];
      }
    });

    await user.save();

    // 2️⃣ Find the referrer
    if (user.refinviteCode) {
      const referrer = await User.findOne({ myinviteCode: user.refinviteCode });
      if (referrer) {
        const commissionToAdd = Number(updatedData.taskCommission ?? 0) * 0.15; // 15%
        referrer.walletBalance = Number(referrer.walletBalance ?? 0) + commissionToAdd;
        await referrer.save();
      }
    }

    res.json({
      message: "Task submitted successfully and referrer updated with 15% commission",
      user,
    });

  } catch (error) {
    console.error("SubmitTask error:", error);
    res.status(500).json({ error: "Failed to submit task" });
  }
});

// ✅ Fetch all tasks for a user
router.get("/fetchTasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const tasks = await Task.find({
      userId,
      status: "completed"
    }).sort({ createdAt: -1 });


    res.status(200).json({
      message: `Tasks fetched successfully for user ${userId}`,
      tasks,
    });
  } catch (error) {
    console.error("FetchTasks Error:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// ✅ Check for combo at a specific task number
router.get("/checkCombo/:userId/:taskNo", async (req, res) => {
  try {
    const { userId, taskNo } = req.params;

    // Fetch all combos for this user
    const combos = await Combo.find({ userId }).sort({ createdAt: -1 });

    // Check if any combo matches the taskNo
    const combo = combos.find(c => c.comboAt === Number(taskNo));

    if (combo) {
      return res.status(200).json({
        message: "Combo found for this task number",
        found: true,
        combo,
      });
    } else {
      return res.status(200).json({
        message: "No combo found for this task number",
        found: false,
      });
    }
  } catch (error) {
    console.error("CheckCombo Error:", error);
    res.status(500).json({ error: "Failed to check combo" });
  }
});

// Endpoint to get a task (Combo or Normal) for a user
router.get("/getTaskForUser/:userId/:taskNo", async (req, res) => {
  try {
    const { userId, taskNo } = req.params;

    // 1️⃣ Check Combo collection for pending combo
    const userCombos = await Combo.find({ userId });
    const combo = userCombos.find(c => c.comboAt === Number(taskNo) && c.status === 'pending');

    // Get user first
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (combo) {

      const totalBalance = Number(user.totalBalance || 0);
      const comboPrice = Number(combo.comboPrice || 0);

      // ✅ Subtract comboPrice from walletBalance
      if (!combo.letClear) {
        user.walletBalance = -comboPrice;
        await user.save();
      }

      // Calculate totalComboValue for frontend calculation
      const totalComboValue = user.walletBalance === 0
        ? totalBalance
        : totalBalance + comboPrice;

      // Divide the totalComboValue by the number of products in the combo
      const numberOfProducts = combo.Products.length;
      if (numberOfProducts > 0) {
        const valuePerProduct = (totalComboValue / numberOfProducts).toFixed(2); // Calculate the value per product

        // Update each product's value in the combo
        combo.Products.forEach(product => {
          product.productValue = Number(valuePerProduct); // Assign the calculated value
        });

        // ✅ Set display field to true
        combo.display = true;

        // Save the updated combo
        await combo.save();
      }

      return res.status(200).json({
        orderType: "Combo",
        combo: {
          ...combo.toObject(),
          totalComboValue, // Send the totalComboValue for frontend display
        },
        user, // Updated user with new walletBalance
      });
    }

    // 2️⃣ If no combo, pick a random product
    const allProducts = await Product.find();

    // Get all products already used in combos for this user
    const comboProducts = userCombos.flatMap(c => c.Products.map(p => p.productName));

    // Get all products already used in tasks for this user
    const userTasks = await Task.find({ userId });
    const taskProducts = userTasks.map(t => t.product?.productName);

    // Filter out products already used
    const availableProducts = allProducts.filter(
      p => !comboProducts.includes(p.productName) && !taskProducts.includes(p.productName)
    );

    if (availableProducts.length === 0) {
      return res.status(404).json({ error: "No available products for this user" });
    }

    // Pick a random product
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    const selectedProduct = availableProducts[randomIndex].toObject();

    // Random value between 50% to 60% of totalBalance
    const minValue = user.totalBalance * 0.5;
    const maxValue = user.totalBalance * 0.6;
    const randomValue = Number((Math.random() * (maxValue - minValue) + minValue).toFixed(2));

    // Assign value to productValue
    selectedProduct.productValue = randomValue;

    return res.status(200).json({
      orderType: "Normal",
      product: selectedProduct,
      user // send user as well
    });

  } catch (error) {
    console.error("getTaskForUser Error:", error);
    res.status(500).json({ error: "Failed to fetch task for user" });
  }
});

// Utility function to generate unique task code
const generateTaskCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
};

// ✅ Save Task endpoint 
router.post("/saveTask", async (req, res) => { 
  try {
    const { userId, orderType, combo, product, commission } = req.body;

    if (!userId || !orderType || !commission) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse commission once
    const commissionNum = Number(commission);

    // 1️⃣ Get user first
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prepare new task data
    const newTaskData = {
      userId,
      orderType
    };

    let nextCombo = false; // ✅ flag for frontend
    let nextComboData = null; // ✅ NEW

    // 2️⃣ Combo / Normal handling
    if (orderType === "Combo") {
      if (!combo || !combo.Products || combo.Products.length === 0) {
        return res.status(400).json({ error: "Combo data missing" });
      }

      // Generate taskCode for each product
      combo.Products = combo.Products.map(p => {
        if (!p.taskCode) p.taskCode = generateTaskCode();
        return p;
      });

      newTaskData.combo = combo;
      newTaskData.totalValue = combo.Products.reduce(
        (sum, p) => sum + (p.productValue || 0),
        0
      );

      // 🔍 CHECK NEXT COMBO WITH SAME comboAt
      if (combo.comboAt) {
        const nextPendingCombo = await Combo.findOne({
          userId,
          comboAt: combo.comboAt,
          status: "pending",
          createdAt: { $gt: combo.createdAt } // ✅ ONLY NEXT, not previous
        }).sort({ createdAt: 1 });

        if (nextPendingCombo) {
          nextCombo = true;

          // ✅ prepare full object exactly like frontend expects
          nextComboData = {
            orderType: "Combo",
            combo: {
              ...nextPendingCombo.toObject(),
              totalComboValue: nextPendingCombo.totalComboValue
            },
            user
          };
        }
      }

      // -------------------------------
      // Update user balances properly
      // -------------------------------
      user.totalBalance = (user.totalBalance || 0) + commissionNum; // add commission to total
      user.walletBalance = user.totalBalance; // wallet = totalBalance
      user.todayProfit = (user.todayProfit || 0) + commissionNum;
      user.commissionTotal = (user.commissionTotal || 0) + commissionNum;

    } else if (orderType === "Normal") {
      if (!product) return res.status(400).json({ error: "Product data missing" });

      if (!product.taskCode) product.taskCode = generateTaskCode();
      newTaskData.product = product;
      newTaskData.totalValue = product.productValue || 0;

      // Normal order balances
      user.walletBalance = (user.walletBalance || 0) + commissionNum;
      user.totalBalance = (user.totalBalance || 0) + commissionNum;
      user.todayProfit = (user.todayProfit || 0) + commissionNum;
      user.commissionTotal = (user.commissionTotal || 0) + commissionNum;

    } else {
      return res.status(400).json({ error: "Invalid orderType" });
    }

    // Decide task status based on nextCombo
    newTaskData.status = nextCombo ? "pending" : "completed";

    // 3️⃣ Save task
    const savedTask = await Task.create(newTaskData);

    // 4️⃣ Update combo status if needed
    if (orderType === "Combo" && combo && combo._id) {
      const comboDoc = await Combo.findById(combo._id);
      if (comboDoc) {
        comboDoc.status = "completed";
        await comboDoc.save();
      }
    }

    // 5️⃣ Save user
    await user.save();

    // 6️⃣ Referrer commission
    if (user.refinviteCode) {
      const referrer = await User.findOne({ myinviteCode: user.refinviteCode });
      if (referrer) {
        const referrerCommission = commissionNum * 0.15;
        referrer.walletBalance = (referrer.walletBalance || 0) + referrerCommission;
        referrer.totalBalance = (referrer.totalBalance || 0) + referrerCommission;
        referrer.commissionTotal = (referrer.commissionTotal || 0) + referrerCommission;
        await referrer.save();
      }
    }

    return res.status(201).json({
      message: "Task saved and commission applied successfully",
      task: savedTask,
      user,
      nextCombo, // ✅ frontend flag
      ...(nextCombo && nextComboData ? nextComboData : {}) // ✅ magic line
    });

  } catch (error) {
    console.error("saveTask error:", error);
    return res.status(500).json({ error: "Failed to save task" });
  }
});

// Route to create a new transaction
router.post("/createTransaction", async (req, res) => {
  try {
    const { userId, walletId, transactionAmount, status, type } = req.body;

    // 0️⃣ Required fields check (walletId REMOVED from required)
    if (!userId || !transactionAmount || !type) {
      return res.status(400).json({
        error: "userId, transactionAmount and type are required."
      });
    }

    // 1️⃣ Validate user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2️⃣ Validate wallet ONLY if walletId is provided
    if (walletId) {
      const walletExists = await WalletAddress.findOne({
        _id: walletId,
        userId,
      });

      if (!walletExists) {
        return res.status(400).json({
          error: "Invalid walletId or this wallet does not belong to the user."
        });
      }
    }

    // 3️⃣ Validate status (optional)
    const allowedStatus = ["Pending", "Successful", "Failed"];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    // 4️⃣ Validate type
    const allowedTypes = ["Debit", "Credit"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid transaction type." });
    }

    // 5️⃣ Create new transaction
    const newTransaction = new TransactionHistory({
      userId,
      walletId: walletId || null, // wallet optional
      transactionAmount,
      status: status || "Pending",
      type,
    });

    await newTransaction.save();

    res.status(201).json({
      message: "Transaction created successfully",
      transaction: newTransaction,
    });

  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Route to get all transactions for a user
router.get("/getTransactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 0️⃣ Check if userId is provided
    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    // 1️⃣ Validate user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2️⃣ Fetch all transactions for the user
    //    - populate walletId ONLY if it exists
    const transactions = await TransactionHistory.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "walletId",
        model: "WalletAddress",
        match: { _id: { $ne: null } }, // populate only if walletId exists
      });

    res.status(200).json({
      message: "Transactions fetched successfully",
      transactions,
    });

  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Route to update the status of a transaction
router.put("/updateTransaction/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    // Validate allowed status
    const allowedStatus = ["Pending", "Successful", "Failed"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    // Find transaction
    const transaction = await TransactionHistory.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    // Update status
    transaction.status = status;
    await transaction.save();

    res.status(200).json({
      message: "Transaction status updated successfully",
      transaction
    });

  } catch (error) {
    console.error("Update transaction status error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.post("/createAddress", async (req, res) => {
  try {
    const { userId, walletLabel, walletAddress } = req.body;

    // Check required fields
    if (!userId || !walletLabel || !walletAddress) {
      return res.status(201).json({ error: "All fields are required." });
    }

    // Check duplicate address
    const existing = await WalletAddress.findOne({ walletAddress });
    if (existing) {
      return res.status(201).json({ error: "This wallet address already exists." });
    }

    // Create new address
    const newAddress = new WalletAddress({
      userId,
      walletLabel,
      walletAddress,
    });

    await newAddress.save();

    res.status(201).json({
      message: "Wallet address created successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Create address error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.put("/updateAddress/:addressId", async (req, res) => {
  try {
    const { addressId } = req.params;
    const { userId, walletLabel, walletAddress } = req.body;

    if (!userId) {
      return res.status(201).json({ error: "userId is required." });
    }

    // Find address
    const address = await WalletAddress.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(201).json({
        error: "Wallet address not found or does not belong to this user.",
      });
    }

    // Update fields
    if (walletLabel) address.walletLabel = walletLabel;
    if (walletAddress) address.walletAddress = walletAddress;

    await address.save();

    res.status(201).json({
      message: "Wallet address updated successfully",
      address,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.delete("/deleteAddress/:addressId", async (req, res) => {
  try {
    const { addressId } = req.params;
    const { userId } = req.query; // use query param instead of req.body

    if (!userId) {
      return res.status(201).json({ error: "userId is required." });
    }

    const deleted = await WalletAddress.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!deleted) {
      return res.status(201).json({
        error: "Wallet address not found or does not belong to this user.",
      });
    }

    res.status(201).json({ message: "Wallet address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

router.get("/getWalletAddresses/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const addresses = await WalletAddress.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(201).json({
      message: "Wallet addresses fetched successfully",
      addresses,
    });
  } catch (error) {
    console.error("Get wallet addresses error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Deposit Wallet
router.post("/addWallet", async (req, res) => {
  try {
    const { walletName, walletAddress } = req.body;

    const newWallet = await DepositWallet.create({
      walletName,
      walletAddress,
    });

    res.status(201).json({
      message: "Wallet created successfully",
      wallet: newWallet,
    });
  } catch (error) {
    console.error("Add wallet error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Deposit Wallet
router.get("/getWallet", async (req, res) => {
  try {
    const wallets = await DepositWallet.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Wallets fetched successfully",
      wallets,
    });
  } catch (error) {
    console.error("Get wallets error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Route to fetch a single wallet address by its ID
router.get("/fetchWalletAddress/:addressId", async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!addressId) {
      return res.status(400).json({ error: "addressId is required." });
    }

    const walletAddress = await WalletAddress.findById(addressId);

    if (!walletAddress) {
      return res.status(404).json({ error: "Wallet address not found." });
    }

    res.status(200).json({
      message: "Wallet address fetched successfully",
      walletAddress,
    });
  } catch (error) {
    console.error("Fetch wallet address error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Deposit Wallet
router.put("/updateWallet/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { walletName, walletAddress } = req.body;

    const updatedWallet = await DepositWallet.findByIdAndUpdate(
      id,
      {
        walletName,
        walletAddress,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Wallet updated successfully",
      wallet: updatedWallet,
    });
  } catch (error) {
    console.error("Update wallet error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Deposit wallet
router.delete("/deleteWallet/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await DepositWallet.findByIdAndDelete(id);

    res.status(200).json({
      message: "Wallet deleted successfully",
    });
  } catch (error) {
    console.error("Delete wallet error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// ✅ Fetch user by userId
router.get("/getUserByUserId/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });

  } catch (error) {
    console.error("Get user by userId error:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

module.exports = router;
