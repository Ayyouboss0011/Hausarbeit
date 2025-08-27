import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Search, 
  Download, 
  Filter, 
  CalendarIcon, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Clock 
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  safetyLevel: "safe" | "not safe";
  policyTriggered?: string;
  reason: string;
  confidence: number;
  ipAddress: string;
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2024-01-20 14:32:15",
    userId: "john.doe@company.com",
    action: "AI Output Validation",
    safetyLevel: "not safe",
    policyTriggered: "Financial Data Protection",
    reason: "Contains sensitive financial information",
    confidence: 89,
    ipAddress: "192.168.1.100"
  },
  {
    id: "2",
    timestamp: "2024-01-20 14:31:48",
    userId: "sarah.smith@company.com",
    action: "AI Output Validation",
    safetyLevel: "safe",
    reason: "Contains only general business advice",
    confidence: 95,
    ipAddress: "192.168.1.101"
  },
  {
    id: "3",
    timestamp: "2024-01-20 14:30:22",
    userId: "mike.jones@company.com",
    action: "AI Output Validation",
    safetyLevel: "safe",
    reason: "General customer service guidance",
    confidence: 92,
    ipAddress: "192.168.1.102"
  },
  {
    id: "4",
    timestamp: "2024-01-20 14:28:15",
    userId: "jane.wilson@company.com",
    action: "AI Output Validation",
    safetyLevel: "not safe",
    policyTriggered: "Customer PII Protection",
    reason: "Contains customer email addresses",
    confidence: 87,
    ipAddress: "192.168.1.103"
  },
  {
    id: "5",
    timestamp: "2024-01-20 14:25:33",
    userId: "alex.brown@company.com",
    action: "AI Output Validation",
    safetyLevel: "safe",
    reason: "Technical documentation content",
    confidence: 98,
    ipAddress: "192.168.1.104"
  }
];

export default function Reports() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [safetyFilter, setSafetyFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.policyTriggered?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSafety = safetyFilter === "all" || log.safetyLevel === safetyFilter;
    
    return matchesSearch && matchesSafety;
  });

  const exportToCSV = () => {
    const headers = ["Timestamp", "User ID", "Action", "Safety Level", "Policy Triggered", "Reason", "Confidence", "IP Address"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.userId,
        log.action,
        log.safetyLevel,
        log.policyTriggered || "",
        `"${log.reason}"`,
        log.confidence,
        log.ipAddress
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-ai-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const safeCount = filteredLogs.filter(log => log.safetyLevel === "safe").length;
  const unsafeCount = filteredLogs.filter(log => log.safetyLevel === "not safe").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Logs & Reports</h1>
          <p className="text-neutral-600">Search and analyze security validation logs</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
          <Button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-guardian hover:bg-guardian-dark"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Logs</p>
                <p className="text-2xl font-bold text-neutral-900">{filteredLogs.length}</p>
              </div>
              <FileText className="w-8 h-8 text-guardian" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Safe Outputs</p>
                <p className="text-2xl font-bold text-status-safe">{safeCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-status-safe" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Blocked Outputs</p>
                <p className="text-2xl font-bold text-status-danger">{unsafeCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {Math.round(filteredLogs.reduce((acc, log) => acc + log.confidence, 0) / filteredLogs.length)}%
                </p>
              </div>
              <Clock className="w-8 h-8 text-guardian" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="shadow-card border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-900">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Safety Level</label>
                <Select value={safetyFilter} onValueChange={setSafetyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-neutral-200">
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="safe">Safe Only</SelectItem>
                    <SelectItem value="not safe">Unsafe Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border border-neutral-200" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange}
                      onSelect={setDateRange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Actions</label>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSafetyFilter("all");
                      setDateRange(new Date());
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">
            Security Validation Logs ({filteredLogs.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Safety Level</TableHead>
                <TableHead>Policy Triggered</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell>{log.userId}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.safetyLevel === "safe" ? "default" : "destructive"}
                      className={
                        log.safetyLevel === "safe"
                          ? "bg-status-safe text-white"
                          : "bg-status-danger text-white"
                      }
                    >
                      {log.safetyLevel === "safe" ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {log.safetyLevel === "safe" ? "Safe" : "Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.policyTriggered ? (
                      <Badge variant="outline" className="text-xs">
                        {log.policyTriggered}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={log.reason}>
                      {log.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{log.confidence}%</span>
                      <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-guardian transition-all duration-300"
                          style={{ width: `${log.confidence}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-neutral-600">{log.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}