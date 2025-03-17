import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = Response>(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`API Request: ${method} ${url}`, {
    method,
    url,
    hasBody: !!body && (method === 'POST' || method === 'PUT' || method === 'PATCH')
  });
  
  try {
    const res = await fetch(url, options);
    console.log(`API Response: ${method} ${url}`, {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Error: ${method} ${url}`, {
      error,
      method,
      url
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the URL from the query key
    const url = queryKey[0] as string;
    
    console.log(`Fetching data from: ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include", // This is important for sending cookies/session
        headers: {
          "Accept": "application/json"
        }
      });
      
      console.log(`Fetch result: status=${res.status}, statusText=${res.statusText}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn(`Authentication error (401) from ${url}`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Successfully fetched data from ${url}`);
      return data;
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
