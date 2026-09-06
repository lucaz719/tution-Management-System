import 'package:dio/dio.dart';

/// Page-window query sent to list endpoints: `?page=<n>&limit=<n>`.
///
/// Pages are 1-based. Repositories should reuse this instead of hand-rolling
/// query maps so every list endpoint paginates the same way.
class PagedQuery {
  const PagedQuery({this.page = 1, this.limit = 20});

  final int page;
  final int limit;

  Map<String, dynamic> toQueryParameters() => {
        'page': page,
        'limit': limit,
      };

  PagedQuery next() => PagedQuery(page: page + 1, limit: limit);
}

/// One decoded page of items plus the cursor state for the next fetch.
class PagedResult<T> {
  const PagedResult({
    required this.items,
    required this.page,
    required this.limit,
    required this.hasMore,
    this.total,
  });

  final List<T> items;
  final int page;
  final int limit;
  final bool hasMore;
  final int? total;

  bool get isLastPage => !hasMore;

  PagedQuery? get nextQuery =>
      hasMore ? PagedQuery(page: page + 1, limit: limit) : null;
}

/// Parses paginated list responses into [PagedResult].
///
/// Accepts the common envelope shapes so repositories share one parser:
/// - `{data: [...], meta: {page, limit, total, hasMore}}`
/// - `{data: [...], page, limit, total, hasMore}` (flat envelope)
/// - `{items: [...], hasMore}` / `{items: [...], total}`
/// - A bare `[...]` list (single page; [hasMore] is false)
///
/// When `hasMore` is absent it is derived: `total != null`
/// ? `(page * limit) < total` : `items.length >= limit`.
/// Unknown shapes yield an empty single page rather than throwing.
PagedResult<T> parsePagedResponse<T>(
  dynamic body, {
  required T Function(Map<String, dynamic>) fromJson,
  PagedQuery? query,
}) {
  final page = query?.page ?? 1;
  final limit = query?.limit ?? 20;

  List<dynamic> rawItems = const [];
  Map<String, dynamic>? meta;
  Map<String, dynamic>? envelope;

  if (body is List) {
    rawItems = body;
  } else if (body is Map<String, dynamic>) {
    envelope = body;
    final data = body['data'];
    if (data is List) {
      rawItems = data;
    } else if (body['items'] is List) {
      rawItems = body['items'] as List;
    }
    final metaRaw = body['meta'];
    if (metaRaw is Map<String, dynamic>) meta = metaRaw;
  }

  final source = meta ?? envelope;
  final total = _asInt(source?['total']);
  var hasMore = _asBool(source?['hasMore']);
  hasMore ??= total != null ? (page * limit) < total : rawItems.length >= limit;

  final items = <T>[];
  for (final raw in rawItems) {
    if (raw is Map<String, dynamic>) items.add(fromJson(raw));
  }

  return PagedResult<T>(
    items: items,
    page: _asInt(source?['page']) ?? page,
    limit: _asInt(source?['limit']) ?? limit,
    hasMore: hasMore,
    total: total,
  );
}

/// Repository helper: fetches one page with `page`/`limit` query params.
///
/// ```dart
/// final first = await fetchPage(
///   dio,
///   '/api/tasks',
///   const PagedQuery(page: 1, limit: 20),
///   TaskDto.fromJson,
/// );
/// ```
Future<PagedResult<T>> fetchPage<T>(
  Dio dio,
  String path,
  PagedQuery query,
  T Function(Map<String, dynamic>) fromJson, {
  Map<String, dynamic>? extraQuery,
  CancelToken? cancelToken,
  Options? options,
}) async {
  final response = await dio.get<dynamic>(
    path,
    queryParameters: {
      ...query.toQueryParameters(),
      if (extraQuery != null) ...extraQuery,
    },
    cancelToken: cancelToken,
    options: options,
  );
  return parsePagedResponse<T>(
    response.data,
    fromJson: fromJson,
    query: query,
  );
}

/// Repository helper: follows [hasMore] until exhausted (or [maxPages]).
///
/// Returns every item across pages. Prefer [fetchPage] for infinite-scroll
/// UIs; use this for small bounded exports/syncs.
Future<List<T>> fetchAllPages<T>(
  Dio dio,
  String path,
  T Function(Map<String, dynamic>) fromJson, {
  int limit = 20,
  int maxPages = 10,
  Map<String, dynamic>? extraQuery,
  CancelToken? cancelToken,
  Options? options,
}) async {
  final all = <T>[];
  var query = PagedQuery(limit: limit);
  for (var i = 0; i < maxPages; i++) {
    final result = await fetchPage<T>(
      dio,
      path,
      query,
      fromJson,
      extraQuery: extraQuery,
      cancelToken: cancelToken,
      options: options,
    );
    all.addAll(result.items);
    final next = result.nextQuery;
    if (next == null) break;
    query = next;
  }
  return all;
}

int? _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

bool? _asBool(dynamic value) {
  if (value is bool) return value;
  if (value is String) {
    final lower = value.toLowerCase();
    if (lower == 'true') return true;
    if (lower == 'false') return false;
  }
  return null;
}
