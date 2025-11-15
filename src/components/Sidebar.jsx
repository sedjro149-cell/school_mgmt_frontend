import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 text-white h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <nav className="flex flex-col gap-2">
        <NavLink to="/" className={({isActive}) => isActive ? "bg-gray-700 p-2 rounded" : "p-2 rounded hover:bg-gray-700"}>Dashboard</NavLink>
        <NavLink to="/parents" className={({isActive}) => isActive ? "bg-gray-700 p-2 rounded" : "p-2 rounded hover:bg-gray-700"}>Parents</NavLink>
        <NavLink to="/students" className={({isActive}) => isActive ? "bg-gray-700 p-2 rounded" : "p-2 rounded hover:bg-gray-700"}>Students</NavLink>
      </nav>
    </div>
  );
}
