import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Activity,
  Shield,
  FileText,
  Settings,
  Menu,
  ChevronLeft,
  FlaskConical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Live Monitor", href: "/monitor", icon: Activity },
  { name: "Policy Management", href: "/policies", icon: Shield },
  { name: "Logs & Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Prompt Testing", href: "/prompt-testing", icon: FlaskConical },
];

export function Sidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className={cn(
        "bg-neutral-50 border-r border-neutral-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-guardian rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-guardian">GuardianAI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0 hover:bg-neutral-200"
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                "hover:bg-neutral-200 hover:text-guardian",
                isActive
                  ? "bg-guardian text-white shadow-sm"
                  : "text-neutral-600"
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0",
                  collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500">
            <div className="font-medium">{user?.email}</div>
            <div>Enterprise Security</div>
          </div>
        </div>
      )}
    </div>
  );
}