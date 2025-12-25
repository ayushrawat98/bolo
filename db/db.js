import sqlite from "better-sqlite3"
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Database {

	database
	queries
	dbPath = process.env.DB_PATH

	constructor() {

		this.database = sqlite(path.join(__dirname, this.dbPath), {})

		this.database.pragma('journal_mode = WAL')
		this.database.pragma("synchronous = NORMAL");
		this.database.pragma("journal_size_limit = 67108864"); // 64 MB
		this.database.pragma("mmap_size = 134217728"); // 128 MB
		this.database.pragma("cache_size = 2000");

		this.database.exec(
			`
				CREATE TABLE IF NOT EXISTS posts (
					id INTEGER PRIMARY KEY,
					username TEXT,
					content TEXT NOT NULL,
					upvotes INTEGER DEFAULT 0,
					ip TEXT NOT NULL,
					path TEXT NOT NULL,
					depth INTEGER NOT NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL,
					thread_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
					parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
					quoted_post_id INTEGER DEFAULT 0,
					file_id INTEGER REFERENCES files(id) ON DELETE CASCADE
				);

				create table if not exists files (
					id INTEGER PRIMARY KEY,
					path text not null,
					mime_type text,
					size integer,
  					width integer,
  					height integer,
					nsfw integer,
  					created_at text
				);

				CREATE TABLE if not exists ratelimit (
    				ip TEXT PRIMARY KEY,
    				time TEXT NOT NULL
				);

				CREATE INDEX if not exists idx_posts_parent ON posts(parent_id);

				CREATE INDEX if not exists idx_posts_path ON posts(path);

				CREATE INDEX if not exists idx_posts_depth ON posts(depth);

            `
		)
		
		this.queries = {
			insertPost: this.database.prepare("insert into posts (username, content, ip, path, depth, created_at, updated_at, thread_id, parent_id, file_id) values (?,?,?,?,?,?,?,?,?,?)"),
			getPosts: this.database.prepare("select p.id, p.username, p.content, p.upvotes, p.created_at, count(c.id) as reply_count from posts p left join posts c on c.parent_id = p.id where p.parent_id is null group by p.id order by p.created_at desc"),
			getPostById: this.database.prepare("select p.id, p.username, p.content, p.upvotes, p.path, p.depth, p.created_at from posts p where id = ?"),
			deletePostById: this.database.prepare("delete from posts where id = ?"),

			getReplies: this.database.prepare("select p.id, p.username, p.content, p.upvotes, p.created_at, count(c.id) as reply_count from posts p left join posts c on c.parent_id = p.id where p.parent_id = ? group by p.id order by p.created_at desc")
		}
	}

	insertParentPost(data) {
		const createThread = this.database.transaction((data) => {
			console.log(data)
			const info = this.queries.insertPost.run(
				data.username,
				data.content,
				data.ip,
				data.path,
				data.depth,
				data.created_at,
				data.updated_at,
				data.thread_id,
				data.parent_id,
				data.file_id)
			const id = info.lastInsertRowid
			this.database.prepare(`UPDATE posts SET thread_id = ?, path = ? WHERE id = ?`).run(id, `${id}/`, id)
			return id
		})
		return createThread(data)
	}

	insertChildPost(data) {
		const createThread = this.database.transaction((data) => {
			const parent = this.queries.getPostById.get(data.parent_id)
			if (!parent) throw new Error('Parent not found')
				console.log(parent)
			const info = this.queries.insertPost.run(
				data.username,
				data.content,
				data.ip,
				data.path,
				parent.depth + 1,
				data.created_at,
				data.updated_at,
				parent.thread_id,
				parent.id,
				data.file_id)
			const id = info.lastInsertRowid
			this.database.prepare(`UPDATE posts SET path = ? WHERE id = ?`).run(`${parent.path}${id}/`, id)
			return id
		})
		return createThread(data)
	}

	getPostById(id) {
		return this.queries.getPostById.get(id)
	}

	getParentPosts() {
		return this.queries.getPosts.all()
	}

	getReplies(id) {
		return this.queries.getReplies.all(id)
	}

	getParentsAndSelf(id) {
		const post = this.getPostById(id)
		const pathArray = this.getParentPaths(post.path)
		// console.log(pathArray)
		const questionString = Array(pathArray.length).fill("?").join(",")
		// console.log(questionString)
		let statement = `SELECT p.id, p.username, p.content, p.upvotes, p.created_at, count(c.id) as reply_count FROM posts p left join posts c on c.parent_id = p.id WHERE p.path IN (${questionString}) group by p.id ORDER BY p.depth`
		// console.log(statement)
		return this.database.prepare(statement).all(...pathArray)
	}

	getParentPaths(path) {
		const parts = path.split('/').filter(Boolean)
		let acc = ''
		const result = []

		for (const p of parts) {
			acc += p + '/'
			result.push(acc)
		}
		return result
	}


}

const instance = new Database()
export default instance