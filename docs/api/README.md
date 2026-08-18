# TMS API Documentation

## Overview
This document describes the API contracts, networking patterns, and authentication for TMS based on the **flutter-networking** skill.

## API Architecture

Based on **flutter-networking** skill patterns:

### Architecture Layers
```
UI Layer (ViewModels) 
    ↓
Repository Layer (caching, aggregation)
    ↓
Service Layer (HTTP endpoints, WebSocket)
    ↓
Network Client (Dio/http)
```

### HTTP Service Template (from flutter-networking skill)
```dart
abstract class HttpService {
  Future<Result<T>> get<T>(String path, {Map<String, dynamic>? query});
  Future<Result<T>> post<T>(String path, {dynamic body});
  Future<Result<T>> put<T>(String path, {dynamic body});
  Future<Result<T>> delete<T>(String path);
}

class DioHttpService implements HttpService {
  final Dio _dio;
  
  DioHttpService(this._dio) {
    _dio.interceptors.add(AuthInterceptor());
    _dio.interceptors.add(LoggingInterceptor());
    _dio.interceptors.add(RetryInterceptor());
  }
  
  @override
  Future<Result<T>> get<T>(String path, {Map<String, dynamic>? query}) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return Success(response.data as T);
    } on DioException catch (e) {
      return Failure(_handleError(e));
    }
  }
  // ... other methods
}
```

## Authentication

Based on **flutter-networking** skill authentication patterns:

### Auth Strategies
1. **Bearer Token** (JWT) - Primary for TMS
2. **Refresh Token** - Automatic token refresh
3. **API Key** - For server-to-server communication

### Auth Interceptor
```dart
class AuthInterceptor extends Interceptor {
  final AuthRepository _authRepo;
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _authRepo.currentAccessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final refreshed = await _authRepo.refreshToken();
      if (refreshed) {
        // Retry original request
        final newReq = err.requestOptions;
        newReq.headers['Authorization'] = 'Bearer ${_authRepo.currentAccessToken}';
        final response = await _dio.fetch(newReq);
        return handler.resolve(response);
      } else {
        await _authRepo.logout();
      }
    }
    handler.next(err);
  }
}
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | User registration |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate tokens |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List tasks (with filters) |
| GET | `/tasks/:id` | Get task details |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| PATCH | `/tasks/:id/complete` | Toggle completion |
| POST | `/tasks/:id/subtasks` | Add subtask |
| PUT | `/tasks/:id/subtasks/:subtaskId` | Update subtask |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Get project details |
| POST | `/projects` | Create project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| GET | `/projects/:id/members` | List project members |
| POST | `/projects/:id/members` | Add member |

### Users/Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Current user profile |
| PUT | `/users/me` | Update profile |
| PUT | `/users/me/password` | Change password |
| GET | `/users/me/notifications` | User notifications |

## Request/Response Models

### Task Models
```dart
class Task {
  final String id;
  final String title;
  final String? description;
  final DateTime? dueDate;
  final TaskPriority priority;
  final TaskStatus status;
  final String projectId;
  final String assigneeId;
  final List<Subtask> subtasks;
  final List<String> tags;
  final DateTime createdAt;
  final DateTime updatedAt;
}

enum TaskPriority { low, medium, high, urgent }
enum TaskStatus { todo, inProgress, review, done }

class Subtask {
  final String id;
  final String title;
  final bool completed;
}
```

### API Response Wrapper
```dart
class ApiResponse<T> {
  final bool success;
  final T? data;
  final ApiError? error;
  final Meta? meta;
}

class ApiError {
  final String code;
  final String message;
  final Map<String, dynamic>? details;
}
```

## Error Handling (from flutter-networking skill)

### Error Types
```dart
sealed class NetworkError extends Exception {
  final String message;
  const NetworkError(this.message);
}

class NetworkTimeoutError extends NetworkError { ... }
class NetworkConnectionError extends NetworkError { ... }
class ServerError extends NetworkError {
  final int statusCode;
  final Map<String, dynamic>? body;
  ...
}
class AuthError extends NetworkError { ... }
class ValidationError extends NetworkError {
  final Map<String, List<String>> fieldErrors;
  ...
}
```

### Retry Logic (from flutter-networking skill)
```dart
class RetryInterceptor extends Interceptor {
  static const _maxRetries = 3;
  static const _baseDelay = Duration(seconds: 1);
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err) && err.requestOptions.extra['retryCount'] < _maxRetries) {
      final retryCount = (err.requestOptions.extra['retryCount'] ?? 0) + 1;
      final delay = _baseDelay * retryCount; // Exponential backoff
      
      await Future.delayed(delay);
      
      final newReq = err.requestOptions.copyWith(
        extra: {'retryCount': retryCount},
      );
      
      try {
        final response = await _dio.fetch(newReq);
        return handler.resolve(response);
      } catch (e) {
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
  
  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
           err.type == DioExceptionType.receiveTimeout ||
           err.type == DioExceptionType.sendTimeout ||
           (err.response?.statusCode ?? 0) >= 500;
  }
}
```

## WebSocket (Real-time Updates)

Based on **flutter-networking** skill WebSocket patterns:

```dart
class TaskWebSocketService {
  final WebSocketChannel _channel;
  final StreamController<TaskEvent> _eventsController = StreamController.broadcast();
  
  Stream<TaskEvent> get events => _eventsController.stream;
  
  TaskWebSocketService(String url) {
    _channel = WebSocketChannel.connect(Uri.parse(url));
    _channel.stream.listen(
      (data) => _eventsController.add(TaskEvent.fromJson(jsonDecode(data))),
      onError: (error) => _eventsController.addError(error),
      onDone: () => _eventsController.close(),
    );
  }
  
  void subscribeToTask(String taskId) {
    _channel.sink.add(jsonEncode({
      'type': 'subscribe',
      'taskId': taskId,
    }));
  }
  
  void sendTaskUpdate(Task task) {
    _channel.sink.add(jsonEncode({
      'type': 'task_update',
      'data': task.toJson(),
    }));
  }
  
  void dispose() {
    _channel.sink.close();
    _eventsController.close();
  }
}

sealed class TaskEvent {
  const TaskEvent();
}

class TaskCreated extends TaskEvent { final Task task; ... }
class TaskUpdated extends TaskEvent { final Task task; ... }
class TaskDeleted extends TaskEvent { final String taskId; ... }
class SubtaskToggled extends TaskEvent { ... }
class CommentAdded extends TaskEvent { ... }
```

## Caching Strategy (from flutter-networking skill)

```dart
class CachedTaskRepository implements TaskRepository {
  final TaskRepository _remote;
  final TaskLocalDataSource _local;
  final CachePolicy _policy;
  
  @override
  Stream<List<Task>> watchTasks() {
    // Merge local and remote streams
    return _local.watchTasks().switchMap((localTasks) {
      return _remote.watchTasks().map((remoteTasks) {
        return _mergeTasks(localTasks, remoteTasks);
      }).onErrorReturn(localTasks);
    });
  }
  
  @override
  Future<Result<Task>> createTask(Task task) async {
    // Optimistic UI update
    await _local.insertTask(task);
    
    final result = await _remote.createTask(task);
    if (result.isFailure) {
      await _local.deleteTask(task.id);
    }
    return result;
  }
}
```

## Background Parsing (from flutter-networking skill)

```dart
class TaskRepositoryImpl implements TaskRepository {
  final HttpService _http;
  
  @override
  Future<Result<List<Task>>> fetchTasks({TaskFilter? filter}) async {
    final result = await _http.get<Map<String, dynamic>>(
      '/tasks',
      query: filter?.toQueryParams(),
    );
    
    return result.map((json) {
      // Parse in background isolate
      return compute(_parseTasks, json);
    });
  }
  
  static List<Task> _parseTasks(Map<String, dynamic> json) {
    final List data = json['data'] ?? [];
    return data.map((e) => Task.fromJson(e)).toList();
  }
}
```

## Performance Optimizations (from flutter-networking skill)

1. **Connection Pooling** - Dio manages connection reuse
2. **Request Throttling** - Debounce search requests
3. **Caching** - HTTP cache headers + local storage
4. **Background Parsing** - Use `compute()` for JSON parsing
5. **Compression** - Enable gzip/deflate

## API Versioning

- Version in URL: `/api/v1/`
- Backward compatibility maintained
- Deprecation headers for old endpoints

## Rate Limiting

- 100 requests/minute per user
- 1000 requests/minute per IP
- 429 response with `Retry-After` header

## Testing API (from flutter-networking skill)

```dart
// Mock HTTP service for testing
class MockHttpService implements HttpService {
  final Map<String, dynamic> _responses = {};
  
  void setResponse(String path, dynamic response) {
    _responses[path] = response;
  }
  
  @override
  Future<Result<T>> get<T>(String path, {Map<String, dynamic>? query}) async {
    await Future.delayed(const Duration(milliseconds: 100));
    return Success(_responses[path] as T);
  }
  // ... other methods
}

// Integration test example
test('fetchTasks returns tasks on success', () async {
  final mockHttp = MockHttpService();
  mockHttp.setResponse('/tasks', {'data': [...]});
  
  final repo = TaskRepositoryImpl(mockHttp);
  final result = await repo.fetchTasks();
  
  expect(result.isSuccess, true);
  expect(result.value, isNotEmpty);
});
```

## References
- [flutter-networking skill](https://github.com/MADTeacher/mad-agents-skills/tree/main/flutter-networking)
- [HTTP Basics](references/http-basics.md)
- [WebSockets](references/websockets.md)
- [Authentication](references/authentication.md)
- [Error Handling](references/error-handling.md)
- [Performance](references/performance.md)