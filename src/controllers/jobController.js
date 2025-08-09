const JobApplication = require('../models/JobApplication');

exports.list = async (req, res) => {
  const items = await JobApplication.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ items });
};

exports.create = async (req, res) => {
  const item = await JobApplication.create({
    userId: req.user._id,
    ...req.body
  });
  res.status(201).json({ item });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const updated = await JobApplication.findOneAndUpdate(
    { _id: id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Job application not found' });
  }
  res.json({ item: updated });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const deleted = await JobApplication.findOneAndDelete({
    _id: id,
    userId: req.user._id
  });
  if (!deleted) {
    return res.status(404).json({ error: 'Job application not found' });
  }
  res.json({ ok: true });
};


