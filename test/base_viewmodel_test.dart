import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../apps/mobile/lib/core/viewmodel/base_viewmodel.dart';

class TestBaseViewModel extends BaseViewModel<ViewModelInitial> {
  TestBaseViewModel() : super(ViewModelInitial());
}

void main() {
  test('BaseViewModel initial state', () {
    final baseViewModel = TestBaseViewModel();
    expect(baseViewModel.state, ViewModelInitial());
  });
}