import { createClient } from '@supabase/supabase-js';

const url = 'https://aiwdcifmyrvugwsjgusx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpd2RjaWZteXJ2dWd3c2pndXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjYyOTUsImV4cCI6MjEwMzMwMjI5NX0.odLlZzja37wSZNMYUbuXYderPHvB72oV_bJ3skLhPdE';
const supabase = createClient(url, key);

async function seed() {
  console.log('Seeding demo projects and tasks...');

  const { data: users } = await supabase.from('users').select('*');
  console.log('Existing users count:', users?.length || 0);

  const sampleUserId = users && users.length > 0 ? users[0].id : null;

  // Insert Demo Projects
  const demoProjects = [
    {
      name: 'E-Commerce Platform Redesign',
      description: 'Revamping the storefront with modern UI components, responsive layout, and enhanced checkout speed.',
      status: 'active',
      owner_id: sampleUserId,
    },
    {
      name: 'Mobile App API Integration',
      description: 'Building microservices endpoints for push notifications, user authentication, and real-time syncing.',
      status: 'active',
      owner_id: sampleUserId,
    },
    {
      name: 'Cloud Infrastructure Migration',
      description: 'Migrating legacy databases to high-availability serverless clusters with containerized deployment pipelines.',
      status: 'on_hold',
      owner_id: sampleUserId,
    },
    {
      name: 'AI Customer Support Bot',
      description: 'Implementing LLM-powered virtual support assistant to handle user inquiries and ticket classification.',
      status: 'completed',
      owner_id: sampleUserId,
    },
  ];

  const { data: insertedProjects, error: projError } = await supabase
    .from('projects')
    .insert(demoProjects)
    .select();

  if (projError) {
    console.error('Error inserting projects:', projError);
  } else {
    console.log('Inserted Projects:', insertedProjects?.length);
  }

  // Fetch all projects to map tasks
  const { data: allProjects } = await supabase.from('projects').select('*');
  const project1 = allProjects?.[0]?.id || null;
  const project2 = allProjects?.[1]?.id || null;

  // Insert Demo Tasks
  const demoTasks = [
    {
      title: 'Design Dark Mode & Design Tokens',
      description: 'Create high-fidelity Tailwind CSS design system with CSS custom properties and color variables.',
      status: 'done',
      priority: 'high',
      project_id: project1,
      assignee_id: sampleUserId,
      task_token: 'TASK-101',
      due_date: '2026-09-01',
    },
    {
      title: 'Setup Supabase Database Schema & RLS',
      description: 'Configure projects, tasks, and users table structure and foreign key relations.',
      status: 'done',
      priority: 'high',
      project_id: project1,
      assignee_id: sampleUserId,
      task_token: 'TASK-102',
      due_date: '2026-09-05',
    },
    {
      title: 'Build Drag and Drop Kanban Columns',
      description: 'Implement column-based task organization with optimistic state updates and smooth animations.',
      status: 'in_progress',
      priority: 'medium',
      project_id: project1,
      assignee_id: sampleUserId,
      task_token: 'TASK-201',
      due_date: '2026-09-10',
    },
    {
      title: 'Integrate Realtime WebSockets for Tasks',
      description: 'Connect Supabase realtime subscription hooks to instantly broadcast board changes across clients.',
      status: 'todo',
      priority: 'high',
      project_id: project2,
      assignee_id: sampleUserId,
      task_token: 'TASK-301',
      due_date: '2026-09-15',
    },
    {
      title: 'Write End-to-End Automated Test Suite',
      description: 'Set up Playwright test suites to cover authentication flows and task CRUD operations.',
      status: 'todo',
      priority: 'low',
      project_id: project2,
      assignee_id: sampleUserId,
      task_token: 'TASK-302',
      due_date: '2026-09-20',
    },
  ];

  const { data: insertedTasks, error: taskError } = await supabase
    .from('tasks')
    .insert(demoTasks)
    .select();

  if (taskError) {
    console.error('Error inserting tasks:', taskError);
  } else {
    console.log('Inserted Tasks:', insertedTasks?.length);
  }

  console.log('Seeding completed!');
}

seed();
