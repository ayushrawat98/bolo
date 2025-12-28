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
					file text
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

				CREATE TABLE if not exists likes (
    				ip TEXT NOT NULL,
    				post_id INTEGER NOT NULL,
					PRIMARY KEY (post_id, ip)
				);

				CREATE INDEX if not exists idx_posts_parent ON posts(parent_id);

				CREATE INDEX if not exists idx_posts_path ON posts(path);

				CREATE INDEX if not exists idx_posts_depth ON posts(depth);

            `
		)
		
		this.queries = {
			insertPost: this.database.prepare("insert into posts (username, content, ip, path, depth, created_at, updated_at, thread_id, parent_id, file) values (?,?,?,?,?,?,?,?,?,?)"),
			// getPosts: this.database.prepare("select p.id, p.username, p.content, p.created_at, p.file, count(c.id) as reply_count, count(l.post_id) as likes from posts p left join posts c on c.parent_id = p.id left join likes l on l.post_id = p.id where p.parent_id is null group by p.id order by p.created_at desc"),
			getPosts : this.database.prepare("SELECT p.id,p.username,p.content,p.created_at,p.file,COALESCE(r.reply_count,0) AS reply_count,COALESCE(l.like_count,0) AS likes FROM posts p LEFT JOIN (SELECT parent_id,COUNT(*) AS reply_count FROM posts GROUP BY parent_id) r ON r.parent_id=p.id LEFT JOIN (SELECT post_id,COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON l.post_id=p.id WHERE p.parent_id IS NULL ORDER BY p.created_at DESC"),
			getPostById: this.database.prepare("select p.id, p.username, p.content, p.path, p.depth, p.file, p.created_at from posts p where id = ?"), //add likes and replies coalesce from above
			deletePostById: this.database.prepare("delete from posts where id = ?"),

			updateParentPost : this.database.prepare(`UPDATE posts SET thread_id = ?, path = ? WHERE id = ?`),
			updateChildPost : this.database.prepare(`UPDATE posts SET path = ? WHERE id = ?`),

			insertLike : this.database.prepare("insert into likes (post_id, ip) values (?,?)"),

			getReplies: this.database.prepare("select p.id, p.username, p.content, p.file, p.created_at, COALESCE(r.reply_count,0) AS reply_count,COALESCE(l.like_count,0) AS likes from posts p left join (SELECT parent_id,COUNT(*) AS reply_count FROM posts GROUP BY parent_id) r ON r.parent_id = p.id left join (SELECT post_id,COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON l.post_id = p.id  where p.parent_id = ? order by likes desc")
		}
	}

	insertParentPost(data) {
		const createThread = this.database.transaction((data) => {
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
				data.file)
			const id = info.lastInsertRowid
			this.queries.updateParentPost.run(id, `${id}/`, id)
			return id
		})
		return createThread(data)
	}

	insertChildPost(data) {
		const createThread = this.database.transaction((data) => {
			const parent = this.queries.getPostById.get(data.parent_id)
			if (!parent) throw new Error('Parent not found')
			const info = this.queries.insertPost.run(
				data.username,
				data.content,
				data.ip,
				data.path,
				parent.depth + 1 > 10 ? 10 : parent.depth + 1,
				data.created_at,
				data.updated_at,
				parent.thread_id,
				parent.id,
				data.file)
			const id = info.lastInsertRowid
			this.queries.updateChildPost.run(`${parent.path}${id}/`, id)
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
		const questionString = Array(pathArray.length).fill("?").join(",")
		let statement = `SELECT p.id, p.username, p.content, p.file, p.created_at, COALESCE(r.reply_count,0) AS reply_count,COALESCE(l.like_count,0) as likes FROM posts p left join (SELECT parent_id,COUNT(*) AS reply_count FROM posts GROUP BY parent_id) r ON r.parent_id=p.id LEFT JOIN (SELECT post_id,COUNT(*) AS like_count FROM likes GROUP BY post_id) l ON l.post_id=p.id  WHERE p.path IN (${questionString}) ORDER BY p.depth`
		return this.database.prepare(statement).all(...pathArray)
	}

	insertLike(post_id, ip){
		return this.queries.insertLike.run(post_id, ip)
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