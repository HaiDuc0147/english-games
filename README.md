# Word Studio · English vocabulary games

One-player vocabulary games for Grade 7 and Grade 8 English lessons.

**Play:** https://haiduc0147.github.io/english-games/

## Lessons
| Grade | Unit | Topic | Words | Direct link |
|---|---|---|---|---|
| 7 | 4 | Music and Arts | 20 | [/g7u4/](https://haiduc0147.github.io/english-games/g7u4/) |
| 8 | 4 | Ethnic Groups of Viet Nam | 22 | [/g8u4/](https://haiduc0147.github.io/english-games/g8u4/) |

The start screen lists every lesson by grade. A direct link (`/english-games/<lesson>/`) opens one lesson straight away, so a class only sees its own words. Old `?lesson=` links still work.

The browser / phone **Back** button moves back through the screens: game → game menu → lesson list. (`404.html` makes the `/<lesson>/` links work on GitHub Pages.)

## Games
- 🖼️ **Picture Match** (warm-up): read the word, tap the right picture out of 4.
- 🧩 **Missing Letters**: fill the gaps in the word (`F_UT_`).
- 🔀 **Scrambled Word**: put the mixed-up letters in order (`LIOS` → `SOIL`).
- 📝 **Sentence Fill**: choose the right word for the gap in a sentence (4 choices). The Vietnamese translation appears after answering.
- 🎲 **Mix All**: a different game for every word.

Words that look or mean too much alike (e.g. *crop* / *harvest*) are never offered together as choices.

## How to play
- Tap letters (or type on a keyboard) to fill the boxes. Tap a filled box, or press ⌫, to take a letter back.
- A wrong answer sends only the wrong letters back. After 3 tries the answer is shown.
- 💡 Hint puts in one correct letter, or removes one wrong choice (−2 points). 🔊 plays the word. On a keyboard, press 1–4 to choose.
- Points: 10 on the first try, then 6/3 (spelling) or 5 (choices), +2 for a streak of 3 or more.
- **Easy**: more clues (Vietnamese meaning, sound, first letters, picture in Sentence Fill). **Hard**: more gaps, decoy letters, no Vietnamese in Picture Match, no picture and same-type choices in Sentence Fill.
- At the end, **Practise tricky words** replays only the words that were missed or needed help.
- 📖 **Study the words** shows every card with picture, IPA and meaning.

Best scores are saved on the device, per lesson.

## Add a new lesson
1. Put one picture per word in a new folder, e.g. `images/g8-u5/`.
2. In `words.js`, copy one lesson block inside `SETS` and change `id`, `grade`, `unit`, `title`, `vi`, `emoji`, `color`, `cover`, the examples in `ex`, the `words` (word, type, IPA, meaning, picture, sentence with `___`, Vietnamese sentence) and the `similar` groups.
3. Bump the `?v=` number on the three file links in `index.html`, then push. The new lesson gets its own link `/english-games/<id>/` automatically.

Pictures are clipart and photos from the web, used for classroom teaching only.
