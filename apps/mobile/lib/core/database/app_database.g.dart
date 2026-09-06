// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $SyncQueueTable extends SyncQueue
    with TableInfo<$SyncQueueTable, SyncQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _idempotencyKeyMeta =
      const VerificationMeta('idempotencyKey');
  @override
  late final GeneratedColumn<String> idempotencyKey = GeneratedColumn<String>(
      'idempotency_key', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _ownerUserIdMeta =
      const VerificationMeta('ownerUserId');
  @override
  late final GeneratedColumn<String> ownerUserId = GeneratedColumn<String>(
      'owner_user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _methodMeta = const VerificationMeta('method');
  @override
  late final GeneratedColumn<String> method = GeneratedColumn<String>(
      'method', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _pathMeta = const VerificationMeta('path');
  @override
  late final GeneratedColumn<String> path = GeneratedColumn<String>(
      'path', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _bodyJsonMeta =
      const VerificationMeta('bodyJson');
  @override
  late final GeneratedColumn<String> bodyJson = GeneratedColumn<String>(
      'body_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _attemptsMeta =
      const VerificationMeta('attempts');
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
      'attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<int> createdAt = GeneratedColumn<int>(
      'created_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        idempotencyKey,
        ownerUserId,
        method,
        path,
        bodyJson,
        attempts,
        createdAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_queue';
  @override
  VerificationContext validateIntegrity(Insertable<SyncQueueData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('idempotency_key')) {
      context.handle(
          _idempotencyKeyMeta,
          idempotencyKey.isAcceptableOrUnknown(
              data['idempotency_key']!, _idempotencyKeyMeta));
    } else if (isInserting) {
      context.missing(_idempotencyKeyMeta);
    }
    if (data.containsKey('owner_user_id')) {
      context.handle(
          _ownerUserIdMeta,
          ownerUserId.isAcceptableOrUnknown(
              data['owner_user_id']!, _ownerUserIdMeta));
    } else if (isInserting) {
      context.missing(_ownerUserIdMeta);
    }
    if (data.containsKey('method')) {
      context.handle(_methodMeta,
          method.isAcceptableOrUnknown(data['method']!, _methodMeta));
    } else if (isInserting) {
      context.missing(_methodMeta);
    }
    if (data.containsKey('path')) {
      context.handle(
          _pathMeta, path.isAcceptableOrUnknown(data['path']!, _pathMeta));
    } else if (isInserting) {
      context.missing(_pathMeta);
    }
    if (data.containsKey('body_json')) {
      context.handle(_bodyJsonMeta,
          bodyJson.isAcceptableOrUnknown(data['body_json']!, _bodyJsonMeta));
    }
    if (data.containsKey('attempts')) {
      context.handle(_attemptsMeta,
          attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncQueueData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      idempotencyKey: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}idempotency_key'])!,
      ownerUserId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}owner_user_id'])!,
      method: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}method'])!,
      path: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}path'])!,
      bodyJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}body_json']),
      attempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}attempts'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}created_at'])!,
    );
  }

  @override
  $SyncQueueTable createAlias(String alias) {
    return $SyncQueueTable(attachedDatabase, alias);
  }
}

class SyncQueueData extends DataClass implements Insertable<SyncQueueData> {
  final int id;

  /// Client-generated idempotency key (uuid v4). Unique: re-enqueue of the
  /// same key is a no-op so retries never double-apply server-side.
  final String idempotencyKey;

  /// Owning user id. Queue rows are per-user and wiped on logout/401.
  final String ownerUserId;

  /// HTTP method: POST, PUT, PATCH, DELETE.
  final String method;

  /// API path, e.g. `/api/tasks/123`.
  final String path;

  /// JSON-encoded request body (null for bodyless e.g. DELETE).
  final String? bodyJson;

  /// Number of replay attempts so far (for backoff / poison-pill triage).
  final int attempts;

  /// Epoch millis, insertion order = replay order (FIFO per user).
  final int createdAt;
  const SyncQueueData(
      {required this.id,
      required this.idempotencyKey,
      required this.ownerUserId,
      required this.method,
      required this.path,
      this.bodyJson,
      required this.attempts,
      required this.createdAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['idempotency_key'] = Variable<String>(idempotencyKey);
    map['owner_user_id'] = Variable<String>(ownerUserId);
    map['method'] = Variable<String>(method);
    map['path'] = Variable<String>(path);
    if (!nullToAbsent || bodyJson != null) {
      map['body_json'] = Variable<String>(bodyJson);
    }
    map['attempts'] = Variable<int>(attempts);
    map['created_at'] = Variable<int>(createdAt);
    return map;
  }

  SyncQueueCompanion toCompanion(bool nullToAbsent) {
    return SyncQueueCompanion(
      id: Value(id),
      idempotencyKey: Value(idempotencyKey),
      ownerUserId: Value(ownerUserId),
      method: Value(method),
      path: Value(path),
      bodyJson: bodyJson == null && nullToAbsent
          ? const Value.absent()
          : Value(bodyJson),
      attempts: Value(attempts),
      createdAt: Value(createdAt),
    );
  }

  factory SyncQueueData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncQueueData(
      id: serializer.fromJson<int>(json['id']),
      idempotencyKey: serializer.fromJson<String>(json['idempotencyKey']),
      ownerUserId: serializer.fromJson<String>(json['ownerUserId']),
      method: serializer.fromJson<String>(json['method']),
      path: serializer.fromJson<String>(json['path']),
      bodyJson: serializer.fromJson<String?>(json['bodyJson']),
      attempts: serializer.fromJson<int>(json['attempts']),
      createdAt: serializer.fromJson<int>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'idempotencyKey': serializer.toJson<String>(idempotencyKey),
      'ownerUserId': serializer.toJson<String>(ownerUserId),
      'method': serializer.toJson<String>(method),
      'path': serializer.toJson<String>(path),
      'bodyJson': serializer.toJson<String?>(bodyJson),
      'attempts': serializer.toJson<int>(attempts),
      'createdAt': serializer.toJson<int>(createdAt),
    };
  }

  SyncQueueData copyWith(
          {int? id,
          String? idempotencyKey,
          String? ownerUserId,
          String? method,
          String? path,
          Value<String?> bodyJson = const Value.absent(),
          int? attempts,
          int? createdAt}) =>
      SyncQueueData(
        id: id ?? this.id,
        idempotencyKey: idempotencyKey ?? this.idempotencyKey,
        ownerUserId: ownerUserId ?? this.ownerUserId,
        method: method ?? this.method,
        path: path ?? this.path,
        bodyJson: bodyJson.present ? bodyJson.value : this.bodyJson,
        attempts: attempts ?? this.attempts,
        createdAt: createdAt ?? this.createdAt,
      );
  SyncQueueData copyWithCompanion(SyncQueueCompanion data) {
    return SyncQueueData(
      id: data.id.present ? data.id.value : this.id,
      idempotencyKey: data.idempotencyKey.present
          ? data.idempotencyKey.value
          : this.idempotencyKey,
      ownerUserId:
          data.ownerUserId.present ? data.ownerUserId.value : this.ownerUserId,
      method: data.method.present ? data.method.value : this.method,
      path: data.path.present ? data.path.value : this.path,
      bodyJson: data.bodyJson.present ? data.bodyJson.value : this.bodyJson,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueData(')
          ..write('id: $id, ')
          ..write('idempotencyKey: $idempotencyKey, ')
          ..write('ownerUserId: $ownerUserId, ')
          ..write('method: $method, ')
          ..write('path: $path, ')
          ..write('bodyJson: $bodyJson, ')
          ..write('attempts: $attempts, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, idempotencyKey, ownerUserId, method, path,
      bodyJson, attempts, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncQueueData &&
          other.id == this.id &&
          other.idempotencyKey == this.idempotencyKey &&
          other.ownerUserId == this.ownerUserId &&
          other.method == this.method &&
          other.path == this.path &&
          other.bodyJson == this.bodyJson &&
          other.attempts == this.attempts &&
          other.createdAt == this.createdAt);
}

class SyncQueueCompanion extends UpdateCompanion<SyncQueueData> {
  final Value<int> id;
  final Value<String> idempotencyKey;
  final Value<String> ownerUserId;
  final Value<String> method;
  final Value<String> path;
  final Value<String?> bodyJson;
  final Value<int> attempts;
  final Value<int> createdAt;
  const SyncQueueCompanion({
    this.id = const Value.absent(),
    this.idempotencyKey = const Value.absent(),
    this.ownerUserId = const Value.absent(),
    this.method = const Value.absent(),
    this.path = const Value.absent(),
    this.bodyJson = const Value.absent(),
    this.attempts = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  SyncQueueCompanion.insert({
    this.id = const Value.absent(),
    required String idempotencyKey,
    required String ownerUserId,
    required String method,
    required String path,
    this.bodyJson = const Value.absent(),
    this.attempts = const Value.absent(),
    required int createdAt,
  })  : idempotencyKey = Value(idempotencyKey),
        ownerUserId = Value(ownerUserId),
        method = Value(method),
        path = Value(path),
        createdAt = Value(createdAt);
  static Insertable<SyncQueueData> custom({
    Expression<int>? id,
    Expression<String>? idempotencyKey,
    Expression<String>? ownerUserId,
    Expression<String>? method,
    Expression<String>? path,
    Expression<String>? bodyJson,
    Expression<int>? attempts,
    Expression<int>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (idempotencyKey != null) 'idempotency_key': idempotencyKey,
      if (ownerUserId != null) 'owner_user_id': ownerUserId,
      if (method != null) 'method': method,
      if (path != null) 'path': path,
      if (bodyJson != null) 'body_json': bodyJson,
      if (attempts != null) 'attempts': attempts,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  SyncQueueCompanion copyWith(
      {Value<int>? id,
      Value<String>? idempotencyKey,
      Value<String>? ownerUserId,
      Value<String>? method,
      Value<String>? path,
      Value<String?>? bodyJson,
      Value<int>? attempts,
      Value<int>? createdAt}) {
    return SyncQueueCompanion(
      id: id ?? this.id,
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      method: method ?? this.method,
      path: path ?? this.path,
      bodyJson: bodyJson ?? this.bodyJson,
      attempts: attempts ?? this.attempts,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (idempotencyKey.present) {
      map['idempotency_key'] = Variable<String>(idempotencyKey.value);
    }
    if (ownerUserId.present) {
      map['owner_user_id'] = Variable<String>(ownerUserId.value);
    }
    if (method.present) {
      map['method'] = Variable<String>(method.value);
    }
    if (path.present) {
      map['path'] = Variable<String>(path.value);
    }
    if (bodyJson.present) {
      map['body_json'] = Variable<String>(bodyJson.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<int>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueCompanion(')
          ..write('id: $id, ')
          ..write('idempotencyKey: $idempotencyKey, ')
          ..write('ownerUserId: $ownerUserId, ')
          ..write('method: $method, ')
          ..write('path: $path, ')
          ..write('bodyJson: $bodyJson, ')
          ..write('attempts: $attempts, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $EntityCacheTable extends EntityCache
    with TableInfo<$EntityCacheTable, EntityCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EntityCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _ownerUserIdMeta =
      const VerificationMeta('ownerUserId');
  @override
  late final GeneratedColumn<String> ownerUserId = GeneratedColumn<String>(
      'owner_user_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _entityTypeMeta =
      const VerificationMeta('entityType');
  @override
  late final GeneratedColumn<String> entityType = GeneratedColumn<String>(
      'entity_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _entityIdMeta =
      const VerificationMeta('entityId');
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
      'entity_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _payloadJsonMeta =
      const VerificationMeta('payloadJson');
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
      'payload_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<int> updatedAt = GeneratedColumn<int>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns =>
      [id, ownerUserId, entityType, entityId, payloadJson, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'entity_cache';
  @override
  VerificationContext validateIntegrity(Insertable<EntityCacheData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('owner_user_id')) {
      context.handle(
          _ownerUserIdMeta,
          ownerUserId.isAcceptableOrUnknown(
              data['owner_user_id']!, _ownerUserIdMeta));
    } else if (isInserting) {
      context.missing(_ownerUserIdMeta);
    }
    if (data.containsKey('entity_type')) {
      context.handle(
          _entityTypeMeta,
          entityType.isAcceptableOrUnknown(
              data['entity_type']!, _entityTypeMeta));
    } else if (isInserting) {
      context.missing(_entityTypeMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(_entityIdMeta,
          entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta));
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('payload_json')) {
      context.handle(
          _payloadJsonMeta,
          payloadJson.isAcceptableOrUnknown(
              data['payload_json']!, _payloadJsonMeta));
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
        {ownerUserId, entityType, entityId},
      ];
  @override
  EntityCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return EntityCacheData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      ownerUserId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}owner_user_id'])!,
      entityType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_type'])!,
      entityId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_id'])!,
      payloadJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}payload_json'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $EntityCacheTable createAlias(String alias) {
    return $EntityCacheTable(attachedDatabase, alias);
  }
}

class EntityCacheData extends DataClass implements Insertable<EntityCacheData> {
  final int id;

  /// Owning user id. Scoped per user, wiped on logout/401.
  final String ownerUserId;

  /// Entity collection, e.g. `tasks`, `profile`.
  final String entityType;

  /// Server-side id of the entity.
  final String entityId;

  /// JSON-encoded entity payload.
  final String payloadJson;

  /// Epoch millis of last write; used for staleness display + LRU trims.
  final int updatedAt;
  const EntityCacheData(
      {required this.id,
      required this.ownerUserId,
      required this.entityType,
      required this.entityId,
      required this.payloadJson,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['owner_user_id'] = Variable<String>(ownerUserId);
    map['entity_type'] = Variable<String>(entityType);
    map['entity_id'] = Variable<String>(entityId);
    map['payload_json'] = Variable<String>(payloadJson);
    map['updated_at'] = Variable<int>(updatedAt);
    return map;
  }

  EntityCacheCompanion toCompanion(bool nullToAbsent) {
    return EntityCacheCompanion(
      id: Value(id),
      ownerUserId: Value(ownerUserId),
      entityType: Value(entityType),
      entityId: Value(entityId),
      payloadJson: Value(payloadJson),
      updatedAt: Value(updatedAt),
    );
  }

  factory EntityCacheData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return EntityCacheData(
      id: serializer.fromJson<int>(json['id']),
      ownerUserId: serializer.fromJson<String>(json['ownerUserId']),
      entityType: serializer.fromJson<String>(json['entityType']),
      entityId: serializer.fromJson<String>(json['entityId']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      updatedAt: serializer.fromJson<int>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'ownerUserId': serializer.toJson<String>(ownerUserId),
      'entityType': serializer.toJson<String>(entityType),
      'entityId': serializer.toJson<String>(entityId),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'updatedAt': serializer.toJson<int>(updatedAt),
    };
  }

  EntityCacheData copyWith(
          {int? id,
          String? ownerUserId,
          String? entityType,
          String? entityId,
          String? payloadJson,
          int? updatedAt}) =>
      EntityCacheData(
        id: id ?? this.id,
        ownerUserId: ownerUserId ?? this.ownerUserId,
        entityType: entityType ?? this.entityType,
        entityId: entityId ?? this.entityId,
        payloadJson: payloadJson ?? this.payloadJson,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  EntityCacheData copyWithCompanion(EntityCacheCompanion data) {
    return EntityCacheData(
      id: data.id.present ? data.id.value : this.id,
      ownerUserId:
          data.ownerUserId.present ? data.ownerUserId.value : this.ownerUserId,
      entityType:
          data.entityType.present ? data.entityType.value : this.entityType,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      payloadJson:
          data.payloadJson.present ? data.payloadJson.value : this.payloadJson,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('EntityCacheData(')
          ..write('id: $id, ')
          ..write('ownerUserId: $ownerUserId, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, ownerUserId, entityType, entityId, payloadJson, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is EntityCacheData &&
          other.id == this.id &&
          other.ownerUserId == this.ownerUserId &&
          other.entityType == this.entityType &&
          other.entityId == this.entityId &&
          other.payloadJson == this.payloadJson &&
          other.updatedAt == this.updatedAt);
}

class EntityCacheCompanion extends UpdateCompanion<EntityCacheData> {
  final Value<int> id;
  final Value<String> ownerUserId;
  final Value<String> entityType;
  final Value<String> entityId;
  final Value<String> payloadJson;
  final Value<int> updatedAt;
  const EntityCacheCompanion({
    this.id = const Value.absent(),
    this.ownerUserId = const Value.absent(),
    this.entityType = const Value.absent(),
    this.entityId = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  EntityCacheCompanion.insert({
    this.id = const Value.absent(),
    required String ownerUserId,
    required String entityType,
    required String entityId,
    required String payloadJson,
    required int updatedAt,
  })  : ownerUserId = Value(ownerUserId),
        entityType = Value(entityType),
        entityId = Value(entityId),
        payloadJson = Value(payloadJson),
        updatedAt = Value(updatedAt);
  static Insertable<EntityCacheData> custom({
    Expression<int>? id,
    Expression<String>? ownerUserId,
    Expression<String>? entityType,
    Expression<String>? entityId,
    Expression<String>? payloadJson,
    Expression<int>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (ownerUserId != null) 'owner_user_id': ownerUserId,
      if (entityType != null) 'entity_type': entityType,
      if (entityId != null) 'entity_id': entityId,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  EntityCacheCompanion copyWith(
      {Value<int>? id,
      Value<String>? ownerUserId,
      Value<String>? entityType,
      Value<String>? entityId,
      Value<String>? payloadJson,
      Value<int>? updatedAt}) {
    return EntityCacheCompanion(
      id: id ?? this.id,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      payloadJson: payloadJson ?? this.payloadJson,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (ownerUserId.present) {
      map['owner_user_id'] = Variable<String>(ownerUserId.value);
    }
    if (entityType.present) {
      map['entity_type'] = Variable<String>(entityType.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<int>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EntityCacheCompanion(')
          ..write('id: $id, ')
          ..write('ownerUserId: $ownerUserId, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $SyncQueueTable syncQueue = $SyncQueueTable(this);
  late final $EntityCacheTable entityCache = $EntityCacheTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [syncQueue, entityCache];
}

typedef $$SyncQueueTableCreateCompanionBuilder = SyncQueueCompanion Function({
  Value<int> id,
  required String idempotencyKey,
  required String ownerUserId,
  required String method,
  required String path,
  Value<String?> bodyJson,
  Value<int> attempts,
  required int createdAt,
});
typedef $$SyncQueueTableUpdateCompanionBuilder = SyncQueueCompanion Function({
  Value<int> id,
  Value<String> idempotencyKey,
  Value<String> ownerUserId,
  Value<String> method,
  Value<String> path,
  Value<String?> bodyJson,
  Value<int> attempts,
  Value<int> createdAt,
});

class $$SyncQueueTableFilterComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get idempotencyKey => $composableBuilder(
      column: $table.idempotencyKey,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get method => $composableBuilder(
      column: $table.method, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get path => $composableBuilder(
      column: $table.path, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get bodyJson => $composableBuilder(
      column: $table.bodyJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));
}

class $$SyncQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get idempotencyKey => $composableBuilder(
      column: $table.idempotencyKey,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get method => $composableBuilder(
      column: $table.method, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get path => $composableBuilder(
      column: $table.path, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get bodyJson => $composableBuilder(
      column: $table.bodyJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));
}

class $$SyncQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get idempotencyKey => $composableBuilder(
      column: $table.idempotencyKey, builder: (column) => column);

  GeneratedColumn<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => column);

  GeneratedColumn<String> get method =>
      $composableBuilder(column: $table.method, builder: (column) => column);

  GeneratedColumn<String> get path =>
      $composableBuilder(column: $table.path, builder: (column) => column);

  GeneratedColumn<String> get bodyJson =>
      $composableBuilder(column: $table.bodyJson, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<int> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$SyncQueueTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()> {
  $$SyncQueueTableTableManager(_$AppDatabase db, $SyncQueueTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncQueueTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> idempotencyKey = const Value.absent(),
            Value<String> ownerUserId = const Value.absent(),
            Value<String> method = const Value.absent(),
            Value<String> path = const Value.absent(),
            Value<String?> bodyJson = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<int> createdAt = const Value.absent(),
          }) =>
              SyncQueueCompanion(
            id: id,
            idempotencyKey: idempotencyKey,
            ownerUserId: ownerUserId,
            method: method,
            path: path,
            bodyJson: bodyJson,
            attempts: attempts,
            createdAt: createdAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String idempotencyKey,
            required String ownerUserId,
            required String method,
            required String path,
            Value<String?> bodyJson = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            required int createdAt,
          }) =>
              SyncQueueCompanion.insert(
            id: id,
            idempotencyKey: idempotencyKey,
            ownerUserId: ownerUserId,
            method: method,
            path: path,
            bodyJson: bodyJson,
            attempts: attempts,
            createdAt: createdAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$SyncQueueTable, SyncQueueData>(table),
                    BaseReferences<_$AppDatabase, $SyncQueueTable,
                        SyncQueueData>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncQueueTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()>;
typedef $$EntityCacheTableCreateCompanionBuilder = EntityCacheCompanion
    Function({
  Value<int> id,
  required String ownerUserId,
  required String entityType,
  required String entityId,
  required String payloadJson,
  required int updatedAt,
});
typedef $$EntityCacheTableUpdateCompanionBuilder = EntityCacheCompanion
    Function({
  Value<int> id,
  Value<String> ownerUserId,
  Value<String> entityType,
  Value<String> entityId,
  Value<String> payloadJson,
  Value<int> updatedAt,
});

class $$EntityCacheTableFilterComposer
    extends Composer<_$AppDatabase, $EntityCacheTable> {
  $$EntityCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$EntityCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $EntityCacheTable> {
  $$EntityCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$EntityCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $EntityCacheTable> {
  $$EntityCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get ownerUserId => $composableBuilder(
      column: $table.ownerUserId, builder: (column) => column);

  GeneratedColumn<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => column);

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get payloadJson => $composableBuilder(
      column: $table.payloadJson, builder: (column) => column);

  GeneratedColumn<int> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$EntityCacheTableTableManager extends RootTableManager<
    _$AppDatabase,
    $EntityCacheTable,
    EntityCacheData,
    $$EntityCacheTableFilterComposer,
    $$EntityCacheTableOrderingComposer,
    $$EntityCacheTableAnnotationComposer,
    $$EntityCacheTableCreateCompanionBuilder,
    $$EntityCacheTableUpdateCompanionBuilder,
    (
      EntityCacheData,
      BaseReferences<_$AppDatabase, $EntityCacheTable, EntityCacheData>
    ),
    EntityCacheData,
    PrefetchHooks Function()> {
  $$EntityCacheTableTableManager(_$AppDatabase db, $EntityCacheTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EntityCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EntityCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EntityCacheTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> ownerUserId = const Value.absent(),
            Value<String> entityType = const Value.absent(),
            Value<String> entityId = const Value.absent(),
            Value<String> payloadJson = const Value.absent(),
            Value<int> updatedAt = const Value.absent(),
          }) =>
              EntityCacheCompanion(
            id: id,
            ownerUserId: ownerUserId,
            entityType: entityType,
            entityId: entityId,
            payloadJson: payloadJson,
            updatedAt: updatedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String ownerUserId,
            required String entityType,
            required String entityId,
            required String payloadJson,
            required int updatedAt,
          }) =>
              EntityCacheCompanion.insert(
            id: id,
            ownerUserId: ownerUserId,
            entityType: entityType,
            entityId: entityId,
            payloadJson: payloadJson,
            updatedAt: updatedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$EntityCacheTable, EntityCacheData>(table),
                    BaseReferences<_$AppDatabase, $EntityCacheTable,
                        EntityCacheData>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$EntityCacheTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $EntityCacheTable,
    EntityCacheData,
    $$EntityCacheTableFilterComposer,
    $$EntityCacheTableOrderingComposer,
    $$EntityCacheTableAnnotationComposer,
    $$EntityCacheTableCreateCompanionBuilder,
    $$EntityCacheTableUpdateCompanionBuilder,
    (
      EntityCacheData,
      BaseReferences<_$AppDatabase, $EntityCacheTable, EntityCacheData>
    ),
    EntityCacheData,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$SyncQueueTableTableManager get syncQueue =>
      $$SyncQueueTableTableManager(_db, _db.syncQueue);
  $$EntityCacheTableTableManager get entityCache =>
      $$EntityCacheTableTableManager(_db, _db.entityCache);
}
