function sanitize(req, res, next) {

	let name = sanitizeInput(req.body.name)
	let title = sanitizeInput(req.body.title)
	let content = sanitizeInput(req.body.content)

	// content = escapeHTML(content)

	req.sanitizedBody = {
		name: name,
		title: title,
		content: content
	}

	if (content.length == 0) {
		return res.status(400).send("विषयः आवश्यकः।")
	}

	next()
}


function escapeHTML(str) {
	let out = "", i = 0, ch;
	for (; i < str.length; i++) {
		ch = str[i];
		if (ch === '<') out += '&lt;';
		else if (ch === '>') out += '&gt;';
		else if (ch === '&') out += '&amp;';
		else if (ch === '"') out += '&quot;';
		else if (ch === "'") out += '&#39;';
		else out += ch;
	}
	return out;
}

function sanitizeFilename(name) {
	if (typeof name !== "string") return "file";

	// Normalize
	name = name.normalize("NFKC");
	// Remove zero-width, bidi, tags & control chars
	name = name.replace(/[\u200B-\u200F\uFEFF]/g, "");
	name = name.replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
	name = name.replace(/[\u{E0000}-\u{E007F}]/gu, "");
	name = name.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");


	// Remove unsafe filesystem characters
	name = name.replace(/[\/\\:\*\?"<>\|]/g, "");
	// Remove emoji + emoji ZWJ sequences
	// Match only emoji with codepoints in typical ranges
	name = name.replace(
		/([\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])(\uFE0F|\u200D[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}])*/gu,
		""
	);
	// Replace spaces with underscores
	name = name.replace(/\s+/g, "_");
	// Block multiple dots and leading dots
	name = name.replace(/^\.+/, "");      // remove leading dots
	name = name.replace(/\.+/g, ".");     // collapse ... to .
	// Prevent blank name
	if (name.trim() === "") name = "file";

	return name;
}

function sanitizeInput(str) {
	if (typeof str !== "string") return "";

	// --- 0. Normalize Unicode (NFC like YouTube) ---
	str = str.normalize("NFC");

	// --- 1. Remove dangerous zero-width/invisible characters ---
	// ZWSP–ZWNJ–ZWJ–FEFF
	str = str.replace(/[\u200B-\u200F\uFEFF]/g, "");

	// Remove old Mongolian separators
	str = str.replace(/[\u180E\u2060]/g, "");

	// --- 2. Remove Unicode Bidi spoofing characters ---
	// These can reverse text direction and create phishing-looking links
	str = str.replace(/[\u202A-\u202E\u2066-\u2069]/g, "");

	// --- 3. Remove Unicode TAG characters (used for phishing) ---
	// Remove Unicode TAG characters (U+E0000–U+E007F)
	str = str.replace(/[\u{E0000}-\u{E007F}]/gu, "");

	// --- 4. Remove control characters except \n and \t ---
	str = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, c =>
		c === "\n" || c === "\t" ? c : ""
	);

	// --- 5. Fix emoji sequences (YouTube/Twitter style) ---

	// 5a. Remove repeated ZWJ (invalid)
	str = str.replace(/\u200D{2,}/g, "\u200D");

	// 5b. Remove variation selectors (VS15/VS16) not attached to emoji
	// VS15 = FE0E, VS16 = FE0F
	str = str.replace(/(?<!\p{Emoji})[\uFE0E\uFE0F]/gu, "");

	// 5c. Break overly long ZWJ emoji chains (> 4 joins)
	str = str.replace(/((?:\p{Emoji}\u200D){4,}\p{Emoji})/gu, m =>
		m.replace(/\u200D/g, "")
	);

	// --- Final trim ---
	return str.trim();
}

export { sanitize, sanitizeInput, sanitizeFilename }