/// Base ViewModel for TMS MVVM architecture.
///
/// Provides common state management patterns:
/// - Loading states
/// - Error handling
/// - Success/error messaging
/// - Lifecycle management
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Base state for all ViewModels.
@immutable
abstract class ViewModelState {
  const ViewModelState({
    this.isLoading = false,
    this.error,
  });

  /// Whether the ViewModel is currently loading.
  final bool isLoading;

  /// Current error message, if any.
  final String? error;

  /// Whether the ViewModel has an error.
  bool get hasError => error != null;
}

/// Initial state - nothing loaded yet.
class ViewModelInitial extends ViewModelState {
  const ViewModelInitial();
}

/// Loading state.
class ViewModelLoading extends ViewModelState {
  const ViewModelLoading() : super(isLoading: true);
}

/// Success state with data.
@immutable
class ViewModelSuccess<T> extends ViewModelState {
  const ViewModelSuccess(this.data) : super(isLoading: false);

  final T data;
}

/// Error state.
@immutable
class ViewModelError extends ViewModelState {
  const ViewModelError(this.message) : super(isLoading: false, error: message);

  final String message;
}

/// Base ViewModel class with common functionality.
abstract class BaseViewModel<T extends ViewModelState>
    extends StateNotifier<T> {
  BaseViewModel(super.initialState);

  /// Set loading state.
  void setLoading() => state = const ViewModelLoading() as T;

  /// Set error state.
  void setError(String message) => state = ViewModelError(message) as T;

  /// Set success state.
  void setSuccess(T newState) => state = newState;

  /// Clear error state.
  void clearError() {
    if (state.hasError) {
      // Subclasses should implement specific clear logic
    }
  }

  /// Handle async operation with standard loading/error/success pattern.
  Future<void> execute(Future<void> Function() operation) async {
    setLoading();
    try {
      await operation();
    } catch (e) {
      setError(e.toString());
      rethrow;
    }
  }

  /// Handle async operation that returns data.
  Future<R> executeWithResult<R>(Future<R> Function() operation) async {
    setLoading();
    try {
      final result = await operation();
      return result;
    } catch (e) {
      setError(e.toString());
      rethrow;
    }
  }
}

/// Mixin for ViewModels that manage a list of items.
mixin ListViewModelMixin<State extends ViewModelState, Item>
    on BaseViewModel<State> {
  List<Item> get items => const [];

  void addItem(Item item) {
    // Subclasses should implement
  }

  void removeItem(Item item) {
    // Subclasses should implement
  }

  void updateItem(Item item) {
    // Subclasses should implement
  }

  void clearItems() {
    // Subclasses should implement
  }
}

/// Mixin for ViewModels that manage a single selected item.
mixin SelectedItemViewModelMixin<State extends ViewModelState, Item>
    on BaseViewModel<State> {
  Item? get selectedItem => null;

  void selectItem(Item? item) {
    // Subclasses should implement
  }

  void clearSelection() {
    selectItem(null);
  }
}
