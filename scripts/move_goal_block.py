from pathlib import Path

path = Path('/home/ubuntu/workout-tracker-android/app/(tabs)/meal-plan.tsx')
text = path.read_text()
start_marker = '        <View style={styles.profileEditor}>'
end_marker = '        <View style={styles.summary}>'
start = text.index(start_marker)
end = text.index(end_marker, start)
block = text[start:end]
# The note is outside the goal editor block, so the whole selected block can move.
goal_block = block
text = text[:start] + text[end:]
insert_after = '        </Modal>\n'
insert_at = text.index(insert_after) + len(insert_after)
text = text[:insert_at] + goal_block + text[insert_at:]
path.write_text(text)
