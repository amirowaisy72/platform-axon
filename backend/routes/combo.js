const express = require("express");
const router = express.Router();
const Combo = require("../models/Combo");
const Task = require("../models/Task");

// =========================
// CREATE NEW COMBO
// =========================
router.post("/create", async (req, res) => {
    try {
        const { userId, comboAt, comboPrice, commission, Products } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: "userId missing" });
        }

        const combo = new Combo({
            userId,
            comboAt,
            comboPrice,
            commission,
            Products,
        });

        await combo.save();

        res.json({ success: true, combo });

    } catch (error) {
        console.error("Create Combo Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================
// GET ALL COMBOS
// =========================
router.get("/", async (req, res) => {
    try {
        const combos = await Combo.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: combos
        });
    } catch (error) {
        console.error("Fetch Combos Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error });
    }
});

// =========================
// GET COMBO BY USERID
// =========================
router.get("/user/:userId/:end", async (req, res) => {
    try {
        const { userId, end } = req.params;

        // ✅ default end = "user"
        const finalEnd = end || "user";

        let query = { userId };

        if (finalEnd === "user") {
            query.display = true;
        }

        const combos = await Combo.find(query);

        res.status(200).json({
            success: true,
            data: combos
        });

    } catch (error) {
        console.error("Get Combo by User Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error
        });
    }
});

// =========================
// UPDATE COMBO
// =========================
router.put("/update/:id", async (req, res) => {
    try {
        const updated = await Combo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Combo updated successfully!",
            data: updated
        });
    } catch (error) {
        console.error("Update Combo Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error });
    }
});

// =========================
// DELETE COMBO
// =========================
router.delete("/delete/:id", async (req, res) => {
    try {
        await Combo.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Combo deleted successfully!"
        });
    } catch (error) {
        console.error("Delete Combo Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error });
    }
});

// DELETE /api/reset/:userId
router.delete("/reset/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ success: false, error: "userId required" });

        // Delete combos
        const deletedCombos = await Combo.deleteMany({ userId });

        // Delete tasks
        const deletedTasks = await Task.deleteMany({ userId });

        res.json({
            success: true,
            combosDeleted: deletedCombos.deletedCount,
            tasksDeleted: deletedTasks.deletedCount,
        });
    } catch (error) {
        console.error("Reset User Data Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;
