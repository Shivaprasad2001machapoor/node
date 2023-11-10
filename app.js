const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDataDbObjectToResponseObject = (eachData) => {
  return {
    id: eachData.id,
    todo: eachData.todo,
    priority: eachData.priority,
    status: eachData.status,
    category: eachData.category,
    dueDate: format(new Date(eachData.due_date), "yyyy-MM-dd"),
  };
};

const isValidStatus = (status) => {
  return ["TO DO", "IN PROGRESS", "DONE"].includes(status);
};

const isValidPriority = (priority) => {
  return ["HIGH", "MEDIUM", "LOW"].includes(priority);
};

const isValidCategory = (category) => {
  return ["WORK", "HOME", "LEARNING"].includes(category);
};

const isValidDateFormat = (date) => {
  return /\d{4}-\d{2}-\d{2}/.test(date);
};

const validateQueryParams = (request, response, next) => {
  const { status, priority, category, date } = request.query;
  if (status && !isValidStatus(status)) {
    return response.status(400).send("Invalid Todo Status");
  }
  if (priority && !isValidPriority(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  }
  if (category && !isValidCategory(category)) {
    return response.status(400).send("Invalid Todo Category");
  }
  if (date && !isValidDateFormat(date)) {
    return response.status(400).send("Invalid Due Date");
  }
  next();
};

app.use(validateQueryParams);

app.get("/todos/", async (request, response) => {
  const { status, priority, category, date, search_q } = request.query;

  let getTodosQuery = `
    SELECT *
    FROM todo
    WHERE 1 = 1`;

  if (status) {
    getTodosQuery += ` AND status = '${status}'`;
  }
  if (priority) {
    getTodosQuery += ` AND priority = '${priority}'`;
  }
  if (category) {
    getTodosQuery += ` AND category = '${category}'`;
  }
  if (date) {
    getTodosQuery += ` AND due_date = '${date}'`;
  }
  if (search_q) {
    getTodosQuery += ` AND todo LIKE '%${search_q}%'`;
  }

  const todos = await database.all(getTodosQuery);
  response.send(todos.map((todo) => convertDataDbObjectToResponseObject(todo)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  if (todo) {
    response.send(convertDataDbObjectToResponseObject(todo));
  } else {
    response.status(404).send("Todo not found");
  }
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  if (!isValidDateFormat(date)) {
    return response.status(400).send("Invalid Due Date");
  }

  const getAgendaQuery = `
    SELECT *
    FROM todo
    WHERE due_date = '${date}';`;

  const agendaData = await database.all(getAgendaQuery);
  response.send(
    agendaData.map((todo) => convertDataDbObjectToResponseObject(todo))
  );
});

/* API 4
Path: /todos/
Method: POST
Description:
Create a todo in the todo table,

Request
{
  "id": 6,
  "todo": "Finalize event theme",
  "priority": "LOW",
  "status": "TO DO",
  "category": "HOME",
  "dueDate": "2021-02-22"
}
Response
Todo Successfully Added 

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (!todo || !priority || !status || !category || !dueDate) {
    return response.status(400).send("Invalid Data");
  }

  try {
    const postTodoQuery = `
      INSERT INTO todo (id, todo, priority, status, category, due_date)
      VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

    const todoAdded = await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } catch (error) {
    response.status(500).send("Internal Server Error");
  }
}); */

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (!todo || !priority || !status || !category || !dueDate) {
    return response.status(400).send("Invalid Data");
  }

  try {
    if (!isValidStatus(status)) {
      return response.status(400).send("Invalid Todo Status");
    }

    if (!isValidPriority(priority)) {
      return response.status(400).send("Invalid Todo Priority");
    }

    if (!isValidCategory(category)) {
      return response.status(400).send("Invalid Todo Category");
    }

    if (!isValidDateFormat(dueDate)) {
      return response.status(400).send("Invalid Due Date");
    }

    const postTodoQuery = `
      INSERT INTO todo (id, todo, priority, status, category, due_date)
      VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

    await database.run(postTodoQuery);

    response.send("Todo Successfully Added");
  } catch (error) {
    response.status(500).send("Internal Server Error");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  if (Object.keys(requestBody).length === 1) {
    const key = Object.keys(requestBody)[0];
    const value = requestBody[key];

    let updateColumn = "";

    switch (key) {
      case "status":
        updateColumn = "Status";
        if (isValidStatus(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Status");
        return;

      case "priority":
        updateColumn = "Priority";
        if (isValidPriority(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Priority");
        return;

      case "todo":
        updateColumn = "Todo";
        break;

      case "category":
        updateColumn = "Category";
        if (isValidCategory(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Category");
        return;

      case "dueDate":
        updateColumn = "Due Date";
        if (isValidDateFormat(value)) {
          break;
        }
        response.status(400).send("Invalid Due Date");
        return;

      default:
        response.status(400).send("Invalid Data");
        return;
    }

    const updateTodoQuery = `
      UPDATE todo
      SET ${key} = '${value}'
      WHERE id = ${todoId};`;

    const updateResult = await database.run(updateTodoQuery);
    if (updateResult.changes > 0) {
      response.send(`${updateColumn} Updated`);
    } else {
      response.status(404).send("Todo not found");
    }
  } else {
    response.status(400).send("Invalid Data");
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;

  const deleteResult = await database.run(deleteTodoQuery);
  if (deleteResult.changes === 1) {
    response.send("Todo Deleted");
  } else {
    response.status(404).send("Todo not found");
  }
});

module.exports = app;

/* if (todoAdded.changes === 1) {
    response.send("Todo Successfully Added");
  }


const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// Define a function to convert database object to response object
const convertDataDbObjectToResponseObject = (eachData) => {
  return {
    id: eachData.id,
    todo: eachData.todo,
    priority: eachData.priority,
    status: eachData.status,
    category: eachData.category,
    dueDate: format(new Date(eachData.due_date), "yyyy-MM-dd"),
  };
};

// Helper functions to check valid status, priority, category, and date format
const isValidStatus = (status) => {
  return ["TO DO", "IN PROGRESS", "DONE"].includes(status);
};

const isValidPriority = (priority) => {
  return ["HIGH", "MEDIUM", "LOW"].includes(priority);
};

const isValidCategory = (category) => {
  return ["WORK", "HOME", "LEARNING"].includes(category);
};

const isValidDateFormat = (date) => {
  return /\d{4}-\d{2}-\d{2}/.test(date);
};

// Middleware to validate query parameters
const validateQueryParams = (request, response, next) => {
  const { status, priority, category, date } = request.query;
  if (status && !isValidStatus(status)) {
    return response.status(400).send("Invalid Todo Status");
  }
  if (priority && !isValidPriority(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  }
  if (category && !isValidCategory(category)) {
    return response.status(400).send("Invalid Todo Category");
  }
  if (date && !isValidDateFormat(date)) {
    return response.status(400).send("Invalid Due Date");
  }
  next();
};

app.use(validateQueryParams);

// GET request to fetch todos based on query parameters
app.get("/todos/", async (request, response) => {
  const { status, priority, category, date, search_q } = request.query;

  let getTodosQuery = `
    SELECT *
    FROM todo
    WHERE 1 = 1`;

  if (status) {
    getTodosQuery += ` AND status = '${status}'`;
  }
  if (priority) {
    getTodosQuery += ` AND priority = '${priority}'`;
  }
  if (category) {
    getTodosQuery += ` AND category = '${category}'`;
  }
  if (date) {
    getTodosQuery += ` AND due_date = '${date}'`;
  }
  if (search_q) {
    getTodosQuery += ` AND todo LIKE '%${search_q}%'`;
  }

  const todos = await database.all(getTodosQuery);
  response.send(todos.map((todo) => convertDataDbObjectToResponseObject(todo)));
});

// GET request to fetch a specific todo by ID
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  if (todo) {
    response.send(convertDataDbObjectToResponseObject(todo));
  } else {
    response.status(404).send("Todo not found");
  }
});

// GET request to fetch todos by due date
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  if (!isValidDateFormat(date)) {
    return response.status(400).send("Invalid Due Date");
  }

  const getAgendaQuery = `
    SELECT *
    FROM todo
    WHERE due_date = '${date}';`;

  const agendaData = await database.all(getAgendaQuery);
  response.send(
    agendaData.map((todo) => convertDataDbObjectToResponseObject(todo))
  );
});

// POST request to add a new todo
app.post("/todos/", async (request, response) => {
  const { todo, priority, status, category, dueDate } = request.body;

  if (
    !todo ||
    !priority ||
    !status ||
    !category ||
    !dueDate ||
    !isValidStatus(status) ||
    !isValidPriority(priority) ||
    !isValidCategory(category) ||
    !isValidDateFormat(dueDate)
  ) {
    return response.status(400).send("Invalid Data");
  }

  try {
    const postTodoQuery = `
      INSERT INTO todo (todo, priority, status, category, due_date)
      VALUES ('${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } catch (error) {
    response.status(500).send("Internal Server Error");
  }
});

// PUT request to update a specific todo by ID
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;

  if (!todoId) {
    response.status(400).send("Todo ID is required");
  }

  if (Object.keys(requestBody).length === 1) {
    const key = Object.keys(requestBody)[0];
    const value = requestBody[key];

    if (key === "status" && !isValidStatus(value)) {
      response.status(400).send("Invalid Todo Status");
    } else if (key === "priority" && !isValidPriority(value)) {
      response.status(400).send("Invalid Todo Priority");
    } else if (key === "category" && !isValidCategory(value)) {
      response.status(400).send("Invalid Todo Category");
    } else if (key === "dueDate" && !isValidDateFormat(value)) {
      response.status(400).send("Invalid Due Date");
    } else {
      const updateTodoQuery = `
        UPDATE todo
        SET ${key} = '${value}'
        WHERE id = ${todoId};`;

      const updateResult = await database.run(updateTodoQuery);
      if (updateResult.changes > 0) {
        response.send(`${key} Updated`);
      } else {
        response.status(404).send("Todo not found");
      }
    }
  } else {
    response.status(400).send("Invalid Data");
  }
});

// DELETE request to delete a specific todo by ID
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  if (!todoId) {
    response.status(400).send("Todo ID is required");
  }

  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;

  const deleteResult = await database.run(deleteTodoQuery);
  if (deleteResult.changes === 1) {
    response.send("Todo Deleted");
  } else {
    response.status(404).send("Todo not found");
  }
});

module.exports = app;

/* const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDataDbObjectToResponseObject = (eachData) => {
  return {
    id: eachData.id,
    todo: eachData.todo,
    priority: eachData.priority,
    status: eachData.status,
    category: eachData.category,
    dueDate: format(new Date(eachData.due_date), "yyyy-MM-dd"),
  };
};

// Helper function to check valid status
const isValidStatus = (status) => {
  return ["TO DO", "IN PROGRESS", "DONE"].includes(status);
};

// Helper function to check valid priority
const isValidPriority = (priority) => {
  return ["HIGH", "MEDIUM", "LOW"].includes(priority);
};

// Helper function to check valid category
const isValidCategory = (category) => {
  return ["WORK", "HOME", "LEARNING"].includes(category);
};

// Helper function to check valid date format
const isValidDateFormat = (date) => {
  return /\d{4}-\d{2}-\d{2}/.test(date);
};

// Middleware to handle query parameter validation
const validateQueryParams = (request, response, next) => {
  const { status, priority, category, date } = request.query;
  if (status && !isValidStatus(status)) {
    return response.status(400).send("Invalid Todo Status");
  }
  if (priority && !isValidPriority(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  }
  if (category && !isValidCategory(category)) {
    return response.status(400).send("Invalid Todo Category");
  }
  if (date && !isValidDateFormat(date)) {
    return response.status(400).send("Invalid Due Date");
  }
  next();
};

app.use(validateQueryParams);

app.get("/todos/", async (request, response) => {
  const { status, priority, category, date, search_q } = request.query;

  let getTodosQuery = `
    SELECT *
    FROM todo
    WHERE 1 = 1`;

  if (status) {
    getTodosQuery += ` AND status = '${status}'`;
  }
  if (priority) {
    getTodosQuery += ` AND priority = '${priority}'`;
  }
  if (category) {
    getTodosQuery += ` AND category = '${category}'`;
  }
  if (date) {
    getTodosQuery += ` AND due_date = '${date}'`;
  }
  if (search_q) {
    getTodosQuery += ` AND todo LIKE '%${search_q}%'`;
  }

  const todos = await database.all(getTodosQuery);
  response.send(todos.map((todo) => convertDataDbObjectToResponseObject(todo)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  if (todo) {
    response.send(convertDataDbObjectToResponseObject(todo));
  } else {
    response.status(404).send("Todo not found");
  }
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const getAgendaQuery = `
    SELECT *
    FROM todo
    WHERE due_date = '${date}';`;

  const agendaData = await database.all(getAgendaQuery);
  response.send(
    agendaData.map((todo) => convertDataDbObjectToResponseObject(todo))
  );
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
    INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;

  if (
    isValidStatus(status) &&
    isValidPriority(priority) &&
    isValidCategory(category) &&
    isValidDateFormat(dueDate)
  ) {
    await database.run(postTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400).send("Invalid Data");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  if (Object.keys(requestBody).length === 1) {
    const key = Object.keys(requestBody)[0];
    const value = requestBody[key];

    let updateColumn = "";

    switch (key) {
      case "status":
        updateColumn = "Status";
        if (isValidStatus(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Status");
        return;

      case "priority":
        updateColumn = "Priority";
        if (isValidPriority(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Priority");
        return;

      case "todo":
        updateColumn = "Todo";
        break;

      case "category":
        updateColumn = "Category";
        if (isValidCategory(value)) {
          break;
        }
        response.status(400).send("Invalid Todo Category");
        return;

      case "dueDate":
        updateColumn = "Due Date";
        if (isValidDateFormat(value)) {
          break;
        }
        response.status(400).send("Invalid Due Date");
        return;

      default:
        response.status(400).send("Invalid Data");
        return;
    }

    const updateTodoQuery = `
      UPDATE todo
      SET ${key} = '${value}'
      WHERE id = ${todoId};`;

    const updateResult = await database.run(updateTodoQuery);
    if (updateResult.changes > 0) {
      response.send(`${updateColumn} Updated`);
    } else {
      response.status(404).send("Todo not found");
    }
  } else {
    response.status(400).send("Invalid Data");
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;

  const deleteResult = await database.run(deleteTodoQuery);
  if (deleteResult.changes === 1) {
    response.send("Todo Deleted");
  } else {
    response.status(404).send("Todo not found");
  }
});

module.exports = app;

/* const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//convert

const convertDataDbObjectToResponseObject = (eachData) => {
  return {
    id: eachData.id,
    todo: eachData.todo,
    priority: eachData.priority,
    status: eachData.status,
    category: eachData.category,
    dueDate: eachData.due_date,
  };
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await database.all(getTodosQuery);
  response.send(
    data.map((eachData) => convertDataDbObjectToResponseObject(eachData))
  );
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const getAgendaQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      due_date = '${date}';`;

  const agendadata = await database.all(getAgendaQuery);
  response.send(
    agendadata.map((eachData) => convertDataDbObjectToResponseObject(eachData))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(convertDataDbObjectToResponseObject(todo));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status } = request.body;
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}'
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
*/
