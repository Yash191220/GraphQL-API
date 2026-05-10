import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useApolloClient, gql } from '@apollo/client';
import { LogOut, Plus, CheckCircle2, Circle, Trash2, Database, LayoutDashboard, Settings, Clock, X, BellRing } from 'lucide-react';

const GET_ME = gql`
  query GetMe {
    me {
      id
      username
      email
    }
  }
`;

const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      title
      description
      completed
      timerSeconds
      createdAt
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($title: String!, $description: String, $timerSeconds: Int) {
    createTask(title: $title, description: $description, timerSeconds: $timerSeconds) {
      id
      title
      description
      completed
      timerSeconds
      createdAt
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $completed: Boolean, $timerSeconds: Int) {
    updateTask(id: $id, completed: $completed, timerSeconds: $timerSeconds) {
      id
      completed
      timerSeconds
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

function TaskTimer({ task, onTimeUp }) {
  const { id, createdAt, timerSeconds, completed } = task;
  const [timeLeft, setTimeLeft] = useState(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (completed || !timerSeconds || !createdAt) return;

    let startString = createdAt;
    if (typeof startString === 'string' && !startString.includes('T') && !startString.includes('Z')) {
      startString = startString.replace(' ', 'T') + 'Z';
    }
    
    const start = new Date(startString).getTime() || new Date(Number(createdAt)).getTime();
    if (!start) return;

    const end = start + timerSeconds * 1000;

    const calculateTimeLeft = () => {
      const now = Date.now();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    const initialDiff = calculateTimeLeft();
    setTimeLeft(initialDiff);

    if (initialDiff === 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      onTimeUp(task);
      return;
    }

    const interval = setInterval(() => {
      const diff = calculateTimeLeft();
      setTimeLeft(diff);
      if (diff === 0) {
        clearInterval(interval);
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          onTimeUp(task);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, timerSeconds, completed, id, onTimeUp, task]);

  if (!timerSeconds || timeLeft === null) return null;

  const d = Math.floor(timeLeft / (3600 * 24));
  const h = Math.floor((timeLeft % (3600 * 24)) / 3600).toString().padStart(2, '0');
  const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  let displayTime = '';
  if (d > 0) displayTime += `${d}d `;
  displayTime += `${h}:${m}:${s}`;

  return (
    <div className={`flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-md border ${
      timeLeft === 0 && !completed 
        ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
        : completed 
          ? 'bg-slate-800 text-slate-500 border-slate-700'
          : 'bg-primary/10 text-primary border-primary/20'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      {completed ? "Done" : timeLeft === 0 ? "Time's Up!" : displayTime}
    </div>
  );
}

export default function Dashboard({ onLogout }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  // Timer Input State
  const [timerD, setTimerD] = useState('');
  const [timerH, setTimerH] = useState('');
  const [timerM, setTimerM] = useState('');
  const [timerS, setTimerS] = useState('');

  // Time's Up Modal State
  const [timeUpTask, setTimeUpTask] = useState(null);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [defaultTimer, setDefaultTimer] = useState(() => localStorage.getItem('defaultTimer') || '0');

  const { data: userData, loading: userLoading } = useQuery(GET_ME);
  const { data: tasksData, loading: tasksLoading, error: tasksError } = useQuery(GET_TASKS);
  const client = useApolloClient();

  const handleFullLogout = async () => {
    await client.clearStore();
    onLogout();
  };

  // Automatically log out if the token is invalid (i.e. user data returns null)
  useEffect(() => {
    if (!userLoading && !userData?.me) {
      handleFullLogout();
    }
  }, [userLoading, userData]);

  const [createTask] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const [updateTask] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });

  const getSecondsFromInputs = () => {
    let secs = 0;
    if (timerD) secs += parseInt(timerD) * 86400;
    if (timerH) secs += parseInt(timerH) * 3600;
    if (timerM) secs += parseInt(timerM) * 60;
    if (timerS) secs += parseInt(timerS);
    return secs;
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    let seconds = getSecondsFromInputs() || parseInt(defaultTimer) * 60;
    
    createTask({ variables: { 
      title: newTaskTitle, 
      description: '',
      timerSeconds: seconds > 0 ? seconds : null
    } });
    
    setNewTaskTitle('');
    setTimerD(''); setTimerH(''); setTimerM(''); setTimerS('');
  };

  const handleToggleTask = (task) => {
    updateTask({ variables: { id: task.id, completed: !task.completed } });
  };

  const handleDeleteTask = (id) => {
    deleteTask({ variables: { id } });
  };

  const saveSettings = () => {
    localStorage.setItem('defaultTimer', defaultTimer);
    setShowSettings(false);
  };

  // Time's Up Actions
  const handleTimeUpMarkComplete = () => {
    if (timeUpTask) {
      updateTask({ variables: { id: timeUpTask.id, completed: true } });
      setTimeUpTask(null);
    }
  };

  const handleTimeUpExtend = () => {
    if (timeUpTask) {
      const extraSeconds = getSecondsFromInputs() || 300; // default extend by 5 mins if inputs empty
      updateTask({ variables: { id: timeUpTask.id, timerSeconds: timeUpTask.timerSeconds + extraSeconds } });
      setTimeUpTask(null);
      setTimerD(''); setTimerH(''); setTimerM(''); setTimerS('');
    }
  };

  if (userLoading || tasksLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
            <Database className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            GraphQL API
          </span>
        </div>
        
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Menu</div>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium">
              <LayoutDashboard className="w-5 h-5" />
              Tasks Dashboard
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-800/50 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {userData?.me?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{userData?.me?.username || 'Guest'}</p>
              <p className="text-xs text-slate-400 truncate">{userData?.me?.email || 'guest@example.com'}</p>
            </div>
          </div>
          <button
            onClick={handleFullLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-5xl mx-auto p-8">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
              <p className="text-slate-400">Manage your tasks via GraphQL Mutations</p>
            </div>
          </header>

          {/* Create Task Form */}
          <form onSubmit={handleCreateTask} className="mb-8 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative bg-surface rounded-xl p-3 flex flex-col xl:flex-row items-center border border-slate-700 gap-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 bg-transparent border-none px-4 py-2 text-white placeholder-slate-500 focus:outline-none w-full"
              />
              <div className="flex items-center gap-2 border-t xl:border-t-0 xl:border-l border-slate-700 pt-3 xl:pt-0 pl-0 xl:pl-4 w-full xl:w-auto overflow-x-auto">
                <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 shrink-0">
                  <Clock className="w-4 h-4 mr-1 text-primary" />
                  <input type="number" min="0" placeholder="d" value={timerD} onChange={e=>setTimerD(e.target.value)} className="w-8 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none" />
                  <span>:</span>
                  <input type="number" min="0" placeholder="h" value={timerH} onChange={e=>setTimerH(e.target.value)} className="w-8 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none" />
                  <span>:</span>
                  <input type="number" min="0" placeholder="m" value={timerM} onChange={e=>setTimerM(e.target.value)} className="w-8 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none" />
                  <span>:</span>
                  <input type="number" min="0" placeholder="s" value={timerS} onChange={e=>setTimerS(e.target.value)} className="w-8 bg-transparent text-center text-sm text-white placeholder-slate-600 focus:outline-none" />
                </div>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-slate-900 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              </div>
            </div>
          </form>

          {/* Tasks List */}
          {tasksError ? (
             <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
               Error loading tasks: {tasksError.message}
             </div>
          ) : tasksData?.tasks?.length === 0 ? (
            <div className="text-center py-16 bg-surface/50 rounded-2xl border border-slate-800 border-dashed">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-1">No tasks yet</h3>
              <p className="text-slate-500">Create your first task to see GraphQL in action.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksData?.tasks?.map((task) => (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    task.completed
                      ? 'bg-surface/30 border-slate-800'
                      : 'bg-surface border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={`flex-shrink-0 transition-colors ${
                        task.completed ? 'text-emerald-500' : 'text-slate-500 hover:text-primary'
                      }`}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span
                        className={`text-lg transition-colors ${
                          task.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <TaskTimer task={task} onTimeUp={setTimeUpTask} />
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time's Up Modal */}
        {timeUpTask && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <BellRing className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Time's Up!</h3>
                <p className="text-slate-400 mb-6">
                  The timer for <strong className="text-white">"{timeUpTask.title}"</strong> has finished. What would you like to do?
                </p>

                <div className="space-y-4">
                  <button 
                    onClick={handleTimeUpMarkComplete}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Complete
                  </button>
                  
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-left">
                    <label className="block text-sm font-medium text-slate-300 mb-3">Or extend time by:</label>
                    <div className="flex items-center gap-2 mb-4">
                      <input type="number" placeholder="d" value={timerD} onChange={e=>setTimerD(e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-sm py-1.5 text-white" />
                      <input type="number" placeholder="h" value={timerH} onChange={e=>setTimerH(e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-sm py-1.5 text-white" />
                      <input type="number" placeholder="m" value={timerM} onChange={e=>setTimerM(e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-sm py-1.5 text-white" />
                      <input type="number" placeholder="s" value={timerS} onChange={e=>setTimerS(e.target.value)} className="w-12 bg-slate-900 border border-slate-700 rounded text-center text-sm py-1.5 text-white" />
                    </div>
                    <button 
                      onClick={handleTimeUpExtend}
                      className="w-full py-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 font-medium transition-colors"
                    >
                      Extend Timer
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setTimeUpTask(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  App Settings
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default Task Timer (minutes)
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Automatically apply this timer to all new tasks.
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={defaultTimer}
                    onChange={(e) => setDefaultTimer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveSettings}
                  className="px-4 py-2 rounded-lg bg-primary text-slate-900 font-medium hover:bg-primary/90 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
