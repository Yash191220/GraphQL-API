const typeDefs = `#graphql
  type User {
    id: ID!
    username: String!
    email: String!
    tasks: [Task!]!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    completed: Boolean!
    timerSeconds: Int
    createdAt: String
    user: User!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    users: [User!]!
    tasks: [Task!]!
    task(id: ID!): Task
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(usernameOrEmail: String!, password: String!): AuthPayload!
    createTask(title: String!, description: String, timerSeconds: Int): Task!
    updateTask(id: ID!, title: String, description: String, completed: Boolean, timerSeconds: Int): Task!
    deleteTask(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
