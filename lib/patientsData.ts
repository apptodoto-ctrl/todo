export const initialPatients = [
  { id: 1, name: "María González", age: 8, diagnosis: "TEA", therapist: "Josefina P.", sessions: 12, nextSession: "22 Mar 10:00", status: "activo", initials: "MG", color: "from-violet-500 to-purple-600" },
  { id: 2, name: "Carlos Morales", age: 45, diagnosis: "ACV", therapist: "Josefina P.", sessions: 8, nextSession: "22 Mar 14:30", status: "activo", initials: "CM", color: "from-blue-500 to-indigo-600" },
  { id: 3, name: "Sofía Reyes", age: 6, diagnosis: "Desarrollo Motor", therapist: "Josefina P.", sessions: 5, nextSession: "23 Mar 09:00", status: "evaluacion", initials: "SR", color: "from-emerald-500 to-teal-600" },
  { id: 4, name: "Pedro Vargas", age: 67, diagnosis: "Artritis Reumatoide", therapist: "Josefina P.", sessions: 15, nextSession: "24 Mar 11:00", status: "activo", initials: "PV", color: "from-amber-500 to-orange-500" },
  { id: 5, name: "Ana Torres", age: 34, diagnosis: "Lesión Medular", therapist: "Josefina P.", sessions: 20, nextSession: "27 Mar 10:30", status: "alta", initials: "AT", color: "from-pink-500 to-rose-500" },
  { id: 6, name: "Luis Campos", age: 12, diagnosis: "TDAH", therapist: "Josefina P.", sessions: 3, nextSession: "27 Mar 12:00", status: "evaluacion", initials: "LC", color: "from-cyan-500 to-blue-500" },
];

export type Patient = typeof initialPatients[0];
