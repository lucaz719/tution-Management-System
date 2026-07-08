class TmsFormatters {
  const TmsFormatters._();

  static const List<String> _months = <String>[
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  static String currency(double amount) {
    return 'NPR ${amount.toStringAsFixed(0)}';
  }

  static String shortDate(DateTime date) {
    return '${date.day} ${_months[date.month - 1]} ${date.year}';
  }

  static String monthYear(DateTime date) {
    return '${_months[date.month - 1]} ${date.year}';
  }

  static String time(DateTime date) {
    final int hour =
        date.hour == 0 ? 12 : (date.hour > 12 ? date.hour - 12 : date.hour);
    final String minute = date.minute.toString().padLeft(2, '0');
    final String meridiem = date.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $meridiem';
  }

  static String shortDateTime(DateTime date) {
    return '${shortDate(date)} · ${time(date)}';
  }
}
