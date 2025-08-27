import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import heroImage from "@/assets/guardian-hero.jpg";

const securityMetrics = [
  { label: "AI Outputs Checked Today", value: "2,847", icon: Activity, change: "+12%" },
  { label: "Safe Responses", value: "94.2%", icon: CheckCircle, change: "+2.1%" },
  { label: "Blocked Unsafe Outputs", value: "165", icon: AlertTriangle, change: "-5%" },
  { label: "Active Policies", value: "23", icon: Shield, change: "0%" },
];

const safetyData = [
  { name: "Safe", value: 94.2, color: "hsl(var(--status-safe))" },
  { name: "Unsafe", value: 5.8, color: "hsl(var(--status-danger))" },
];

const timelineData = [
  { time: "00:00", safe: 245, unsafe: 12 },
  { time: "04:00", safe: 189, unsafe: 8 },
  { time: "08:00", safe: 432, unsafe: 18 },
  { time: "12:00", safe: 598, unsafe: 25 },
  { time: "16:00", safe: 387, unsafe: 15 },
  { time: "20:00", safe: 298, unsafe: 9 },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-guardian shadow-elevated">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
          <p className="text-lg opacity-90">Real-time monitoring of AI model outputs and security policies</p>
          <div className="mt-4 text-sm opacity-75">
            Last scan: 2 minutes ago • Next policy update: 4 hours
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {securityMetrics.map((metric, index) => (
          <Card key={index} className="shadow-card border-card-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">{metric.label}</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{metric.value}</p>
                  <p className={`text-xs mt-1 ${
                    metric.change.includes('+') ? 'text-status-safe' : 
                    metric.change.includes('-') ? 'text-status-danger' : 'text-neutral-500'
                  }`}>
                    {metric.change} from yesterday
                  </p>
                </div>
                <div className="w-12 h-12 bg-guardian/10 rounded-lg flex items-center justify-center">
                  <metric.icon className="w-6 h-6 text-guardian" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Distribution */}
        <Card className="shadow-card border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-900">Safety Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safetyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {safetyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid hsl(var(--neutral-200))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              {safetyData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-neutral-600">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detection Timeline */}
        <Card className="shadow-card border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-900">24-Hour Detection Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--neutral-300))" />
                  <XAxis dataKey="time" stroke="hsl(var(--neutral-500))" />
                  <YAxis stroke="hsl(var(--neutral-500))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid hsl(var(--neutral-200))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-card)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="safe" 
                    stroke="hsl(var(--status-safe))" 
                    strokeWidth={2}
                    name="Safe Outputs"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unsafe" 
                    stroke="hsl(var(--status-danger))" 
                    strokeWidth={2}
                    name="Unsafe Outputs"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: "2 min ago", event: "High-risk output blocked", status: "danger", details: "Contains sensitive financial data" },
              { time: "15 min ago", event: "Policy update applied", status: "safe", details: "Updated customer data protection rules" },
              { time: "1 hour ago", event: "Suspicious pattern detected", status: "warning", details: "Unusual AI output frequency from user@company.com" },
              { time: "2 hours ago", event: "Security scan completed", status: "safe", details: "All systems operating normally" },
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-neutral-50">
                <div className={`w-2 h-2 rounded-full ${
                  item.status === 'safe' ? 'bg-status-safe' :
                  item.status === 'danger' ? 'bg-status-danger' : 'bg-status-warning'
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-900">{item.event}</div>
                  <div className="text-xs text-neutral-500">{item.details}</div>
                </div>
                <div className="text-xs text-neutral-400">{item.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}