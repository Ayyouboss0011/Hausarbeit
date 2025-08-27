import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Key, 
  Users, 
  Palette, 
  Bell, 
  Shield,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "security_officer" | "viewer";
  status: "active" | "inactive";
  lastLogin: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@company.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-01-20 14:30:22"
  },
  {
    id: "2",
    name: "Sarah Smith",
    email: "sarah.smith@company.com",
    role: "security_officer",
    status: "active",
    lastLogin: "2024-01-20 13:45:10"
  },
  {
    id: "3",
    name: "Mike Jones",
    email: "mike.jones@company.com",
    role: "viewer",
    status: "active",
    lastLogin: "2024-01-20 12:20:15"
  }
];

export default function Settings() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [apiEndpoint, setApiEndpoint] = useState("https://api.guardian-ai.com/v1");
  const [apiKey, setApiKey] = useState("gai_****************************");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [autoBlockHighRisk, setAutoBlockHighRisk] = useState(true);
  const { toast } = useToast();

  const handleSaveApiConfig = () => {
    toast({
      title: "API Configuration Saved",
      description: "Your API settings have been updated successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-status-danger text-white";
      case "security_officer": return "bg-status-warning text-white";
      case "viewer": return "bg-neutral-500 text-white";
      default: return "bg-neutral-500 text-white";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-guardian" />
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
          <p className="text-neutral-600">Configure GuardianAI system preferences and security options</p>
        </div>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-neutral-100">
          <TabsTrigger value="api" className="flex items-center space-x-2">
            <Key className="w-4 h-4" />
            <span>API Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* API Configuration */}
        <TabsContent value="api">
          <Card className="shadow-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-guardian" />
                <span>API Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.guardian-ai.com/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      defaultValue="30"
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h4 className="font-medium text-neutral-900 mb-2">Connection Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-status-safe rounded-full" />
                      <span className="text-sm text-neutral-600">Connected</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Last verified: 2 minutes ago
                    </div>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <h4 className="font-medium text-neutral-900 mb-2">Rate Limits</h4>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <div>Requests per minute: 1000</div>
                      <div>Requests per hour: 50000</div>
                      <div>Current usage: 15%</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline">Test Connection</Button>
                <Button onClick={handleSaveApiConfig} className="bg-guardian hover:bg-guardian-dark">
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users">
          <Card className="shadow-card border-card-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-guardian" />
                <span>User Management</span>
              </CardTitle>
              <Button className="bg-guardian hover:bg-guardian-dark">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === "active" ? "default" : "secondary"}
                          className={user.status === "active" ? "bg-status-safe text-white" : ""}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">{user.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-status-danger hover:text-status-danger">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="shadow-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-guardian" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <div className="text-sm text-neutral-600">
                      Receive email alerts for security events
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Slack Notifications</Label>
                    <div className="text-sm text-neutral-600">
                      Send alerts to Slack channels
                    </div>
                  </div>
                  <Switch
                    checked={slackNotifications}
                    onCheckedChange={setSlackNotifications}
                  />
                </div>
              </div>

              {emailNotifications && (
                <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
                  <Label className="text-base font-medium">Email Configuration</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-recipients">Recipients</Label>
                      <Textarea
                        id="email-recipients"
                        placeholder="security@company.com, admin@company.com"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-frequency">Frequency</Label>
                      <Select defaultValue="immediate">
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-neutral-200">
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} className="bg-guardian hover:bg-guardian-dark">
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="shadow-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-guardian" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-block High Risk Content</Label>
                    <div className="text-sm text-neutral-600">
                      Automatically block outputs flagged as high risk
                    </div>
                  </div>
                  <Switch
                    checked={autoBlockHighRisk}
                    onCheckedChange={setAutoBlockHighRisk}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Admin Approval</Label>
                    <div className="text-sm text-neutral-600">
                      Require admin approval for new policies
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Log All Activities</Label>
                    <div className="text-sm text-neutral-600">
                      Maintain detailed logs of all system activities
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Confidence Thresholds</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="high-risk-threshold">High Risk Threshold (%)</Label>
                      <Input
                        id="high-risk-threshold"
                        type="number"
                        defaultValue="85"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medium-risk-threshold">Medium Risk Threshold (%)</Label>
                      <Input
                        id="medium-risk-threshold"
                        type="number"
                        defaultValue="60"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-medium">Data Retention</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="log-retention">Log Retention (days)</Label>
                      <Select defaultValue="90">
                        <SelectTrigger>
                          <SelectValue placeholder="Select retention period" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-neutral-200">
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue placeholder="Select backup frequency" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-neutral-200">
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-guardian hover:bg-guardian-dark">
                  Save Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}