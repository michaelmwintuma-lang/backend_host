// backend server for campus collab
// started working on this last week, still needs some cleanup

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors()); // needed for frontend to work
app.use(express.json());






// database connection - using render postgres
const pool = new Pool({
  connectionString: "postgresql://campus_collab_user:Z8q84I0WQLVdlDPGInx0Gfa2NJjLvhv2@dpg-d4oor87gi27c738lmon0-a.oregon-postgres.render.com/campus_collab",
  ssl: {
    rejectUnauthorized: false, // had to add this for render
  },
});




// root endpoint - just checking if server is up
app.get("/", async (req, res) => res.send("Campus Collab"));

// register new user
app.post('/api/register', async (req,res) => {
  try{
    const {name,email,password } = req.body
    // validate inputs
    if (!name || !email || !password){
      return res.status(400).json({ message: "All fields are required"})
    }

    // check if email already exists
    const checkUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if ( checkUser.rows.length > 0) { 
      return res.status(409).json({ message: "Email already exists"});

    }
    // hash the password before saving
    const hashedPassword = await bcrypt.hash(password,10);

    // Only allow student registration - set role to 'student'
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role)
      VALUES ($1,$2,$3,$4)
      RETURNING id, name,email, role`,
      [name, email, hashedPassword, 'student']
    );
    
    res.status(201).json({
      message: " User registered successfully",
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error(err);
    // If role column doesn't exist, try without it (for backward compatibility)
    // had this issue when testing with old db
    if (err.message && err.message.includes('role')) {
      try {
        const hashedPassword = await bcrypt.hash(req.body.password,10);
        const newUser = await pool.query(
          `INSERT INTO users (name, email, password)
          VALUES ($1,$2,$3)
          RETURNING id, name,email`,
          [req.body.name, req.body.email, hashedPassword]
        );
        res.status(201).json({
          message: " User registered successfully",
          user: newUser.rows[0]
        });
      } catch (err2) {
        console.error(err2);
        res.status(500).json({ message: "Server error"});
      }
    } else {
      res.status(500).json({ message: "Server error"});
    }
  }
})

// login endpoint
app.post('/api/login', async (req, res) =>{
  try{
    const { email, password } = req.body;
    // make sure both fields are provided
    if (!email || !password ){
      return res
      .status(400)
      .json({ message: "Email and password are required"});

    }

    // find user by email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length ===0) {
      return res.status(404).json({ message: "User not found" });

    }
    const user = userResult.rows[0];

    // compare passwords
    const isMatch = await bcrypt.compare(password,user.password);
    if (!isMatch){
      return res.status(401).json({ message: "invalid password"});

    }
    // Verify user is a student (if role column exists)
    if (user.role && user.role !== 'student') {
      return res.status(403).json({ message: "Access restricted to students only" });
    }

    res.json({
      message: "Login successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'student'
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error"});

  };

});

// generate random team code - using random string
function generateTeamCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
  // this creates a 6 char code
}
// create a new team
app.post('/api/team/create', async (req, res) => {
  try {
    const { teamName, user_Id } = req.body;

    if (!teamName || !user_Id ) {
      return res.status(400).json({ message: "teamName and userId are required"});

    }
// generate unique code for the team
const teamCode = generateTeamCode();

    const newTeam = await pool.query(
      `INSERT INTO teams (name, code, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, name, code, created_by`,
      [teamName, teamCode, user_Id]
    );
    const teamId = newTeam.rows[0].id;

    // add creator as first member
    await pool.query(
      `INSERT INTO team_members (team_id, user_id)
      VALUES ($1, $2)`,
      [teamId, user_Id]
    );

    res.status(201).json({
      message: "Team created successfully",
      team: newTeam.rows[0]
    });

  } catch (error) {
     console.error("Create team error", error);
     res.status(500).json({ message: "Server error"});

  }

});

// join an existing team
app.post('/api/team/join', async(req, res) => {
  try {
    const { teamId, user_Id } =req.body;

    if (!teamId || !user_Id) {
      return res.status(400).json({ message: "teamId and user_Id are required" });

    }

    // Look up team by ID - make sure it exists
    const teamResult = await pool.query(
      `SELECT id FROM teams WHERE id = $1`,
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }

    const team_Id = teamResult.rows[0].id;

    // Check if user is already a member - prevent duplicates
    const existingMember = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [team_Id, user_Id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ message: "You are already a member of this team" });
    }

    // add user to team
    await pool.query(
      `INSERT INTO team_members (team_id, user_id)
      VALUES ($1, $2)`,
      [team_Id, user_Id]

    );
      res.json({message: "Joined team successfully" });
      
} catch (error){
  console.error("Joined team error:", error);
  res.status(500).json({ message: "Server error"});
}

});


// get all members of a team
app.get('/api/team/:team_Id/members', async (req, res) => {
  try{
    const { team_Id } = req.params;

    // verify team exists first
    const teamCheck = await pool.query(
      `SELECT * FROM teams WHERE id = $1`,
      [team_Id]
    );

    if (teamCheck.rowCount ===0 ){
      return res.status(404).json({ message: "Team not found" });

    }
    // get all members with their user info
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1`,
      [team_Id]
    );

    res.json({
      team_Id,
      memberCount: membersResult.rowCount,
      members: membersResult.rows
    });

  } catch (error) {
    console.error("Error team members:", error );
    res.status(500).json({message: "Server error" });

  }
});


// create a new task
app.post('/api/task', async (req, res) => {
  const { team_id, title, description, assigned_to, due_date, status } = req.body;

  // validate required fields
  if (!team_id || !title) {
    return res.status(400).json({ message: "team_id and title are required" });

  }
  try{
    // insert task into database
    const result = await pool.query(
      `INSERT INTO tasks (team_id, title, description,assigned_to, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [team_id, title, description, assigned_to, due_date, status || 'Pending']
    );
    
    res.json({
      message: "Task created successsfully",
      task: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server error"});

  }
});

// update an existing task
app.put('/api/task/:id', async (req, res) =>{
  const { id } = req.params;
  const { title, description, assigned_to, due_date, status } = req.body;

  // need at least one field to update
  if (!title && !description && !assigned_to && !due_date && !status) {
    return res.status(400).json({ message: "At least one field is required to update"});

  }
  try{
    // build dynamic update query
    const fields =[];
    const values =[];
    let index = 1;

    if (title){
      fields.push(`title =$${index++}`);
      values.push(title);
    }

    if (description) {
      fields.push(` description = $${index++}`);
      values.push(description);

    }
    if (assigned_to) {
      fields.push(` assigned_to = $${index++}`);
      values.push(assigned_to);

  }
  if (due_date) {
      fields.push(` due_date = $${index++}`);
      values.push(due_date);

}
if (status) {
      fields.push(` status = $${index++}`);
      values.push(status);

  }
  values.push(id);

  // build and execute update query
  const query =`UPDATE tasks SET ${fields.join(', ')} WHERE id =$${index} RETURNING *`;
  const result = await pool.query(query,values);

  if (result.rows.length ===0) {
    return res.status(404).json({ message: "Task not found" });

  }
  res.json({
    message: "Task updated succeessfully",
    task: result.rows[0]
  });

} catch (error) {
  console.error("Error updating task:",error);
  res.status(500).json({ message: "Server error"});

}
});


// delete a task
app.delete('/api/task/:id', async (req, res) => {
  try{
    const taskId = req.params.id;

    // delete and return the deleted task
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 RETURNING *`,
      [taskId]

    );

    if ( result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found" });

    }
    res.json({
      message: "Task deleted successfully",
      deletedTask: result.rows[0]
    });

  } catch (error) {
    console.error("Error deleting task", error)
    res.status(500).json({ message: "Server error"});

  }
});

// get all tasks for a team
app.get('/api/task/team/:teamId', async (req, res) => {
  try{
    const {teamId } = req.params;

    // get tasks with assigned user names, sorted by status
    const result = await pool.query(
      `SELECT t.*, u.name as assigned_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.team_id = $1 
       ORDER BY 
         CASE t.status
           WHEN 'Pending' THEN 1
           WHEN 'In Progress' THEN 2
           WHEN 'Completed' THEN 3
           ELSE 4
         END,
         t.id ASC`,
      [teamId]

    );

    res.json({
      teamId,
      taskCount: result.rowCount,
      tasks: result.rows

    });

  } catch (error) {
    console.error("Error fetching tasks by team:", error);
    res.status(500).json({ message: " Server error" });

  }
});

// health check endpoint
app.get('/api/health', async (req, res) => {
  try{
    // simple db check
    await pool.query('SELECT 1');
    res.json({ ok: true });

  } catch (err) {
    console.error("Health check error:", err);
    res.status(500).json({ ok: false, error: err.message });

  }
});

// Get all teams (for dashboard) - returns all teams
app.get('/api/team', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, created_by, created_at 
       FROM teams 
       ORDER BY created_at DESC`
    );
    res.json({ teams: result.rows });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get team details by ID - single team info
app.get('/api/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const result = await pool.query(
      `SELECT id, name, code, created_by, created_at 
       FROM teams 
       WHERE id = $1`,
      [teamId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json({ team: result.rows[0] });
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (for task assignment dropdown)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users ORDER BY name ASC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get team statistics (for dashboard) - aggregates all the stats
app.get('/api/team/:teamId/stats', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get total tasks count
    const totalTasks = await pool.query(
      `SELECT COUNT(*) as count FROM tasks WHERE team_id = $1`,
      [teamId]
    );

    // Get tasks grouped by status
    const tasksByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM tasks 
       WHERE team_id = $1 
       GROUP BY status`,
      [teamId]
    );

    // Get member count for the team
    const memberCount = await pool.query(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
      [teamId]
    );

    // Get tasks assigned to each member with completion stats
    const tasksByMember = await pool.query(
      `SELECT u.id, u.name, u.email, 
              COUNT(t.id) as task_count,
              COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) as completed_count
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.team_id = tm.team_id
       WHERE tm.team_id = $1
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name`,
      [teamId]
    );

    const stats = {
      totalTasks: parseInt(totalTasks.rows[0]?.count || 0),
      memberCount: parseInt(memberCount.rows[0]?.count || 0),
      tasksByStatus: tasksByStatus.rows.reduce((acc, row) => {
        acc[row.status || 'Pending'] = parseInt(row.count);
        return acc;
      }, { Pending: 0, 'In Progress': 0, Completed: 0 }),
      tasksByMember: tasksByMember.rows
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching team stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// test database connection on startup
pool.connect()
  .then((client) => {
    console.log("Connected to Database");
    client.release();
  })
  .catch((err) => {
    console.error("Could not connect to Database", err);
  });

// start server
const PORT = 4000;
app.listen(PORT, () => (
    console.log(`Server running on ${PORT}`)
));
