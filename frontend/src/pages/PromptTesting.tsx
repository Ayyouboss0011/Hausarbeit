import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PromptTesting = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [safetyStatus, setSafetyStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse("");
    setSafetyStatus(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/prompt-testing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResponse(data.response);
      setSafetyStatus(data.safetyStatus);
    } catch (error) {
      console.error("Failed to fetch:", error);
      setResponse("Failed to get a response from the server.");
      setSafetyStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Prompt Testing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enter your Prompt</CardTitle>
            <CardDescription>
              Test the AI's response and safety classification.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <Textarea
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px]"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Testing..." : "Test Prompt"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI Response</CardTitle>
            <CardDescription>
              The generated response from the AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p>Loading...</p>}
            {response && <p className="text-sm">{response}</p>}
            {safetyStatus && (
              <div>
                <Badge
                  variant={safetyStatus === "safe" ? "default" : "destructive"}
                >
                  {safetyStatus}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptTesting;