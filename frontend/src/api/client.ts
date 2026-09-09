// ============================================================
// CodeQuest — API Client
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('codequest_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (data: any) =>
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Levels & Lessons
  getLevels: () => request<any>('/levels'),
  getLevelLessons: (levelId: number) => request<any>(`/levels/${levelId}/lessons`),
  getLesson: (id: number) => request<any>(`/lessons/${id}`),
  getAllLessons: () => request<any>('/lessons-all'),
  createLesson: (data: any) => request<any>('/lessons', { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (id: number, data: any) => request<any>(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLesson: (id: number) => request<any>(`/lessons/${id}`, { method: 'DELETE' }),

  // Quizzes
  getLessonQuiz: (lessonId: number) => request<any>(`/lessons/${lessonId}/quiz`),
  submitQuiz: (quizId: number, answers: any[]) =>
    request<any>(`/quizzes/${quizId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  createQuiz: (data: any) => request<any>('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  upsertLessonQuiz: (lessonId: number, data: any) =>
    request<any>(`/lessons/${lessonId}/quiz`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLessonQuiz: (lessonId: number) =>
    request<any>(`/lessons/${lessonId}/quiz`, { method: 'DELETE' }),

  // Progress
  getProgress: () => request<any>('/progress'),
  getProgressSummary: () => request<any>('/progress/summary'),
  completeActivity: (lessonId: number) =>
    request<any>('/progress/complete', { method: 'POST', body: JSON.stringify({ lesson_id: lessonId }) }),
  getReport: (userId: number) => request<any>(`/progress/report/${userId}`),

  // Users
  getMe: () => request<any>('/users/me'),
  getUsers: () => request<any>('/users'),
  getChildren: () => request<any>('/users/children'),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<any>(`/users/${id}`, { method: 'DELETE' }),
  getStats: () => request<any>('/users/stats'),

  // Assignment — Admin: bulk assign/unassign students to teachers/parents
  assignTeacher: (teacherId: number, studentIds: number[]) =>
    request<any>('/users/assign-teacher', { method: 'POST', body: JSON.stringify({ teacher_id: teacherId, student_ids: studentIds }) }),
  assignParent: (parentId: number, studentIds: number[]) =>
    request<any>('/users/assign-parent', { method: 'POST', body: JSON.stringify({ parent_id: parentId, student_ids: studentIds }) }),
  unassignTeacher: (studentIds: number[]) =>
    request<any>('/users/unassign-teacher', { method: 'POST', body: JSON.stringify({ student_ids: studentIds }) }),
  unassignParent: (studentIds: number[]) =>
    request<any>('/users/unassign-parent', { method: 'POST', body: JSON.stringify({ student_ids: studentIds }) }),

  // Badges
  getBadges: () => request<any>('/badges'),
  getEarnedBadges: () => request<any>('/badges/earned'),
};
