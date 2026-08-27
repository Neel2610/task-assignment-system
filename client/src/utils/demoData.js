import { supabase } from '../supabase';

export const seedDemoDataForUser = async (userId) => {
  try {
    if (!userId) return [];

    // Check existing projects for user
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId);

    if (existingProjects && existingProjects.length > 0) {
      return existingProjects;
    }

    console.log('No projects found for user. Seeding demo projects and tasks...');

    const demoProjects = [
      {
        name: 'E-Commerce Storefront Redesign',
        description: 'Revamping the storefront with modern UI components, responsive layout, and enhanced checkout speed.',
        status: 'active',
        owner_id: userId,
      },
      {
        name: 'Mobile App API Integration',
        description: 'Building microservices endpoints for push notifications, user authentication, and real-time syncing.',
        status: 'active',
        owner_id: userId,
      },
      {
        name: 'Cloud Infrastructure Migration',
        description: 'Migrating legacy databases to high-availability serverless clusters with containerized deployment pipelines.',
        status: 'on_hold',
        owner_id: userId,
      },
      {
        name: 'AI Customer Support Bot',
        description: 'Implementing LLM-powered virtual support assistant to handle user inquiries and ticket classification.',
        status: 'completed',
        owner_id: userId,
      },
    ];

    const { data: createdProjects, error: projErr } = await supabase
      .from('projects')
      .insert(demoProjects)
      .select();

    if (projErr) {
      console.warn('Could not insert demo projects:', projErr.message);
      return [];
    }

    const proj1 = createdProjects?.[0]?.id;
    const proj2 = createdProjects?.[1]?.id;

    // Seed Demo Tasks
    const demoTasks = [
      {
        title: 'Design Dark Mode & UI Components',
        description: 'Create high-fidelity design system with CSS custom properties and dynamic colors.',
        status: 'done',
        priority: 'high',
        project_id: proj1,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-101',
        due_date: '2026-09-01',
      },
      {
        title: 'Configure Supabase DB Schema & Auth',
        description: 'Configure projects, tasks, and users table structure and initial permissions.',
        status: 'done',
        priority: 'high',
        project_id: proj1,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-102',
        due_date: '2026-09-05',
      },
      {
        title: 'Implement Drag & Drop Kanban Board',
        description: 'Implement column-based task organization with optimistic state updates and smooth animations.',
        status: 'in_progress',
        priority: 'medium',
        project_id: proj1,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-201',
        due_date: '2026-09-10',
      },
      {
        title: 'Build Real-Time Notification Service',
        description: 'Connect Supabase realtime subscription hooks to instantly broadcast board changes across clients.',
        status: 'todo',
        priority: 'high',
        project_id: proj2,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-301',
        due_date: '2026-09-15',
      },
      {
        title: 'Write End-to-End Automated Test Suite',
        description: 'Set up Playwright test suites to cover authentication flows and task CRUD operations.',
        status: 'todo',
        priority: 'low',
        project_id: proj2,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-302',
        due_date: '2026-09-20',
      },
      {
        title: 'Setup CI/CD Deployment Pipeline',
        description: 'Automate build, lint check, and automated testing on every pull request.',
        status: 'todo',
        priority: 'medium',
        project_id: proj2,
        assignee_id: userId,
        created_by: userId,
        task_token: 'TASK-303',
        due_date: '2026-09-25',
      },
    ];

    const { error: taskErr } = await supabase.from('tasks').insert(demoTasks);
    if (taskErr) {
      console.warn('Could not insert demo tasks:', taskErr.message);
    }

    return createdProjects || [];
  } catch (err) {
    console.error('Error seeding demo data:', err);
    return [];
  }
};
