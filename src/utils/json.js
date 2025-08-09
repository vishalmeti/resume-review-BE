function extractFirstJson(text) {
  if (!text) return null;
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // Try to find first { ... } block
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = candidate.slice(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

module.exports = { extractFirstJson };


