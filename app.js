import 'dotenv/config'
import express from 'express';
import path from "path";
import cors from 'cors'
import { fileURLToPath } from "url";
import { mainRoute } from './routes/main.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()

if (process.env.NODE_ENV === 'development') {
	app.use(cors())
}

app.use('/api', mainRoute)

app.use('', express.static(path.join(__dirname, "public", "browser"), {maxAge : '1y'}));
app.use('/public', express.static(path.join(__dirname, "public"), {maxAge : '1y'}));
app.get('/*path', (req, res, next) => {
    return res.sendFile(path.join(__dirname, "public", "browser", "index.html"))
})

app.use((err, req, res, next) => {
	if(err.code && err.code == 'LIMIT_FILE_SIZE'){
		return res.status(500).send("सञ्चिकायाः परिमाणमर्यादा (५० MB) अतिक्रान्ता।")
	}
	return res.status(500).send(err.message || "दोषः")
})


if (process.env.NODE_ENV === 'development') {
	app.listen(process.env.PORT, () => {
		console.log("API Server running in dev mode.")
	})
} else {
	const options = {
		key: fs.readFileSync(process.env.PRIVKEY),
		cert: fs.readFileSync(process.env.FULLCHAIN)
	};

	https.createServer(options, app).listen(443, () => {
		console.log('API server running in live mode.');
	});
}