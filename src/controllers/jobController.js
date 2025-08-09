const JobApplication = require('../models/JobApplication');

exports.list = async (req, res) => {
  const items = await JobApplication.find().sort({ createdAt: -1 });
  res.json({ items });
};

exports.create = async (req, res) => {
  const item = await JobApplication.create(req.body);
  res.status(201).json({ item });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const updated = await JobApplication.findByIdAndUpdate(id, req.body, { new: true });
  res.json({ item: updated });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await JobApplication.findByIdAndDelete(id);
  res.json({ ok: true });
};


