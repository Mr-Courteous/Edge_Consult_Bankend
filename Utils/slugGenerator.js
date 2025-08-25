/**
 * @function generateSlug
 * @description Generates a URL-friendly slug from a given title string.
 * @param {string} title - The input string (e.g., a post title).
 * @returns {string} The generated slug.
 */
const generateSlug = (title) => {
    return title
        .toLowerCase()                   // Convert to lowercase
        .trim()                          // Remove leading/trailing whitespace
        .replace(/[^a-z0-9\s-]/g, '')    // Remove non-alphanumeric characters (except spaces and hyphens)
        .replace(/\s+/g, '-')            // Replace multiple spaces with a single hyphen
        .replace(/-+/g, '-');            // Replace multiple hyphens with a single hyphen
};

module.exports = {
    generateSlug
};
