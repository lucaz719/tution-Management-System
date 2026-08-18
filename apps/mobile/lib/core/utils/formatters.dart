String maskEmail(String email) {
  final parts = email.split('@');
  if (parts.length != 2 || parts.first.isEmpty) {
    return email;
  }

  final name = parts.first;
  final hiddenLength = name.length <= 2 ? 1 : name.length - 2;
  final hidden = List<String>.filled(hiddenLength, '*').join();
  final visible = name.length <= 2
      ? '${name.substring(0, 1)}$hidden'
      : '${name.substring(0, 2)}$hidden';
  return '$visible@${parts.last}';
}

String formatCountdown(int totalSeconds) {
  final minutes = (totalSeconds ~/ 60).toString().padLeft(2, '0');
  final seconds = (totalSeconds % 60).toString().padLeft(2, '0');
  return '$minutes:$seconds';
}

String formatShortTime(DateTime value) {
  final hour =
      value.hour == 0 ? 12 : (value.hour > 12 ? value.hour - 12 : value.hour);
  final suffix = value.hour >= 12 ? 'PM' : 'AM';
  final minute = value.minute.toString().padLeft(2, '0');
  return '$hour:$minute$suffix';
}

String formatTimestamp(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  final year = value.year.toString();
  return '$month/$day/$year ${formatShortTime(value)}';
}

String formatDurationClock(Duration value) {
  final hours = value.inHours.toString().padLeft(2, '0');
  final minutes = (value.inMinutes % 60).toString().padLeft(2, '0');
  final seconds = (value.inSeconds % 60).toString().padLeft(2, '0');
  return '$hours:$minutes:$seconds';
}
