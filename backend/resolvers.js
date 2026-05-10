const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET_KEY = 'your_secret_key_here'; // In a real app, use env var

// Helper function to wrap sqlite queries in promises
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await getQuery('SELECT * FROM users WHERE id = ?', [user.id]);
    },
    users: async () => {
      return await allQuery('SELECT * FROM users');
    },
    tasks: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await allQuery('SELECT * FROM tasks WHERE userId = ?', [user.id]);
    },
    task: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await getQuery('SELECT * FROM tasks WHERE id = ? AND userId = ?', [id, user.id]);
    },
  },
  Mutation: {
    register: async (_, { username, email, password }) => {
      // In a real app, hash the password!
      try {
        const result = await runQuery(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, password]
        );
        const user = await getQuery('SELECT * FROM users WHERE id = ?', [result.lastID]);
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1d' });
        return { token, user };
      } catch (error) {
        throw new Error('User already exists or database error');
      }
    },
    login: async (_, { usernameOrEmail, password }) => {
      const user = await getQuery('SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?', [usernameOrEmail, usernameOrEmail, password]);
      if (!user) {
        throw new Error('Invalid credentials. Please check your username/email and password.');
      }
      const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1d' });
      return { token, user };
    },
    createTask: async (_, { title, description, timerSeconds }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const result = await runQuery(
        'INSERT INTO tasks (title, description, timerSeconds, userId) VALUES (?, ?, ?, ?)',
        [title, description, timerSeconds, user.id]
      );
      return await getQuery('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    },
    updateTask: async (_, { id, title, description, completed, timerSeconds }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const task = await getQuery('SELECT * FROM tasks WHERE id = ? AND userId = ?', [id, user.id]);
      if (!task) throw new Error('Task not found');

      const newTitle = title !== undefined ? title : task.title;
      const newDesc = description !== undefined ? description : task.description;
      const newComp = completed !== undefined ? completed : task.completed;
      const newTimer = timerSeconds !== undefined ? timerSeconds : task.timerSeconds;

      await runQuery(
        'UPDATE tasks SET title = ?, description = ?, completed = ?, timerSeconds = ? WHERE id = ?',
        [newTitle, newDesc, newComp ? 1 : 0, newTimer, id]
      );

      return await getQuery('SELECT * FROM tasks WHERE id = ?', [id]);
    },
    deleteTask: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const result = await runQuery('DELETE FROM tasks WHERE id = ? AND userId = ?', [id, user.id]);
      return result.changes > 0;
    },
  },
  User: {
    tasks: async (parent) => {
      return await allQuery('SELECT * FROM tasks WHERE userId = ?', [parent.id]);
    },
  },
  Task: {
    user: async (parent) => {
      return await getQuery('SELECT * FROM users WHERE id = ?', [parent.userId]);
    },
    completed: (parent) => !!parent.completed,
  },
};

module.exports = resolvers;
