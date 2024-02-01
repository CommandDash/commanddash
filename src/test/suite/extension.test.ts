import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import * as os from 'os';
import * as path from 'path';
import { filterSurroundingCode } from '../../utilities/code-processing';
const orignalFile = `import 'package:bloc/bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

enum AuthEvent { signIn, signOut, deleteUser }

class AuthBloc extends Bloc<AuthEvent, bool> {
  AuthBloc() : super(false) {
    on<AuthEvent>((event, emit) async {
      switch (event) {
        case AuthEvent.signIn:
          try {
            UserCredential userCredential = await FirebaseAuth.instance
                .signInWithPopup(GoogleAuthProvider.credential());
            emit(true);
          } catch (e) {
            emit(false);
          }
          break;

        case AuthEvent.signOut:
          FirebaseAuth.instance.signOut();
          break;
        case AuthEvent.deleteUser:
          FirebaseAuth.instance.currentUser!.delete();
      }
    });
  }
}

enum FileStorageEvent { uploadFile, downloadFile, deleteFile }

// implemented file storage bloc
class FileStorageBloc extends Bloc<FileStorageEvent, String> {
  FileStorageBloc() : super("") {
    on<FileStorageEvent>((event, emit) async {
      switch (event) {
        case FileStorageEvent.uploadFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            await ref.putString("Hello World!");
            emit(ref.fullPath);
          } catch (e) {
            emit("");
          }
          break;

        case FileStorageEvent.downloadFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            String file = await ref.putString("file.txt");
            emit(file);
          } catch (e) {
            emit("");
          }
          break;

        case FileStorageEvent.deleteFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            await ref.delete();
            emit("");
          } catch (e) {
            emit("");
          }
      }
    });
  }
}`;

const updatedFile = `import 'package:bloc/bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

enum AuthEvent { signIn, signOut, deleteUser }

class AuthBloc extends Bloc<AuthEvent, bool> {
  AuthBloc() : super(false) {
    on<AuthEvent>((event, emit) async {
      switch (event) {
        case AuthEvent.signIn:
          try {
            UserCredential userCredential = await FirebaseAuth.instance
                .signInWithPopup(GoogleAuthProvider.credential());
            emit(true);
          } catch (e) {
            emit(false);
          }
          break;

        case AuthEvent.signOut:
          FirebaseAuth.instance.signOut();
          break;
        case AuthEvent.deleteUser:
          FirebaseAuth.instance.currentUser!.delete();
      }
    });
  }
}

enum FileStorageEvent { uploadFile, downloadFile, deleteFile }

// implemented file storage bloc
class FileStorageBloc extends Bloc<FileStorageEvent, String> {
  FileStorageBloc() : super("") {
    on<FileStorageEvent>((event, emit) async {
      switch (event) {
        case FileStorageEvent.uploadFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            await ref.putString("Hello World!");
            emit(ref.fullPath);
          } catch (e) {
            emit("");
          }
          break;

        case FileStorageEvent.downloadFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            String file = await ref.putString("file.txt");
            emit(file);
          } catch (e) {
            emit("");
          }
          break;

        case FileStorageEvent.deleteFile:
          try {
            final ref = FirebaseStorage.instance.ref().child("file.txt");
            await ref.delete();
            emit("");
          } catch (e) {
            emit("");
          }
		case FileStorageEvent.deleteFile:
		try {
			final ref = FirebaseStorage.instance.ref().child("file.txt");
			await ref.delete();
			emit("");
		} catch (e) {
			emit("");
		}
		case FileStorageEvent.modifyFile:
		try{

		}catch{
		
		}
      }
    });
  }
}`;

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Test match', async () => {
    // Get the path to the system's temporary directory
    const tempDirectory = os.tmpdir();

    // Construct the file paths
    const tempLeftFilePath = path.join(tempDirectory, 'left.dart');
    const tempRightFilepath = path.join(tempDirectory, 'right.dart');

    // Create Uris for the temporary files
    const tempLeftFileUri = vscode.Uri.file(tempLeftFilePath);
    const tempRightFileUri = vscode.Uri.file(tempRightFilepath);

    // Create the temporary files with initial content
    await vscode.workspace.fs.writeFile(tempLeftFileUri, Buffer.from(orignalFile, 'utf8'));
    await vscode.workspace.fs.writeFile(tempRightFileUri, Buffer.from(updatedFile, 'utf8'));

    // Open the diff view
    await vscode.commands.executeCommand(
      "vscode.diff",
      tempLeftFileUri,
      tempRightFileUri,
      "Current Code ↔ Optimized Code"
    ); //quick diff was also explored, but it works in retrospect: https://code.visualstudio.com/api/extension-guides/scm-provider#quick-diff

    console.log('Diff view opened');
  });


  test('Single match', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {

			}
		  }`;
    const codeCompletion = `@override
		Widget build(BuildContext context) {
			return Sizedbox.shrink();
		}`;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 6);
    assert.strictEqual(result, '			return Sizedbox.shrink();');
  });

  test('Double Matches', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);
			@override
			initState

			@override
			Widget build(BuildContext context) {

			}
		  }`;
    const codeCompletion = `@override
		initState

		@override
		Widget build(BuildContext context) {
			return Sizedbox.shrink();
		}
	}`;

    let result = filterSurroundingCode(orignalContent, codeCompletion, 8);
    assert.strictEqual(result, '			return Sizedbox.shrink();');

  });
  test('No Matches', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);
			@override
			initState

			@override
			Widget build(BuildContext context) {

			}
		  }`;
    const codeCompletion = `return Sizedbox.shrink();
		}`;

    let result = filterSurroundingCode(orignalContent, codeCompletion, 8);
    assert.strictEqual(result, 'return Sizedbox.shrink();');

  });
  test('Curly brackets surrounding with keyword', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {
				if {

				}
			}
		  }`;
    const codeCompletion = `@override
		Widget build(BuildContext context) {
			if {
				return {
					return Sizedbox.shrink();
				}
				}		
			}
		}`;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
    assert.strictEqual(result, '\t\t\t\treturn {\n\t\t\t\t\treturn Sizedbox.shrink();\n\t\t\t\t}');
  });

  test('Curly brackets surrounding without keyword', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {
				{

				}
			}
		  }`;
    const codeCompletion = `@override
		Widget build(BuildContext context) {
			 {
				 {
					return Sizedbox.shrink();
				}
			}	
			}
		}`;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
    assert.strictEqual(result, '\t\t\t\t {\n\t\t\t\t\treturn Sizedbox.shrink();\n\t\t\t\t}');
  });

  test('Handles closing brackets', () => {
    const orignalContent =
      `  int method(int x) {
				// if x is even, return x+x, also close brackets properly
				if (x % 2 == 0) {
					return x + x;

			  }
			}`;
    const codeCompletion =
      `return x + x;\n    }\n  }\n}`;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 4);
    assert.strictEqual((result),
      '    }');

  });

  test('Handles brackets with code', () => {
    const orignalContent =
      `class Evenizer {
				int? returnIfEven(int x) {
				  if (x % 2 == 0) {
					
				}
			  }`;
    const codeCompletion =
      `if (x % 2 == 0) {
				return x;
			  }
			}`;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 3);
    assert.strictEqual((result),
      `return x;
		}`);

  });

  // TODO: This fails
  test('Extra spaces match', () => {
    const orignalContent = `class OldSection extends StatelessWidget {
				final CategoryFeed oldBooks;
				const OldSection(this.oldBooks);

				@override
				Widget build(BuildContext context) {

				}
			} `;
    const codeCompletion = `@override
			Widget build(BuildContext context) {
				return Sizedbox.shrink();
			} `;
    let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
    assert.strictEqual(result, '			return Sizedbox.shrink();');
  });


  test('', () => {
    const fileCode = `import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_ebook_app/src/common/common.dart';
import 'package:flutter_ebook_app/src/features/features.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeScreenSmall extends ConsumerStatefulWidget {
  const HomeScreenSmall({super.key});

  @override
  ConsumerState<HomeScreenSmall> createState() => _HomeScreenSmallState();
}

class _HomeScreenSmallState extends ConsumerState<HomeScreenSmall> {
  void loadData() {
    ref.read(homeFeedNotifierProvider.notifier).fetch();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(homeFeedNotifierProvider).maybeWhen(
            orElse: () => loadData(),
            data: (_) => null,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    final homeDataState = ref.watch(homeFeedNotifierProvider);
    return Scaffold(
      appBar: context.isSmallScreen
          ? AppBar(
              centerTitle: true,
              title: Text(
                Strings.appName,
                style: const TextStyle(fontSize: 20.0),
              ),
            )
          : null,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 500),
        child: homeDataState.maybeWhen(
          orElse: () => const SizedBox.shrink(),
          loading: () => const LoadingWidget(),
          data: (feeds) {
            final popular = feeds.popularFeed;
            final recent = feeds.recentFeed;
            return RefreshIndicator(
              onRefresh: () async => loadData(),
              child: ListView(
                children: <Widget>[
                  if (!context.isSmallScreen) const SizedBox(height: 30.0),
                  FeaturedSection(popular: popular),
                  const SizedBox(height: 20.0),
                  const _SectionTitle(title: 'Categories'),
                  const SizedBox(height: 10.0),
                  _GenreSection(popular: popular),
                  const SizedBox(height: 20.0),
                  const _SectionTitle(title: 'Recently Added'),
                  const SizedBox(height: 20.0),
                  _NewSection(recent: recent),
                ],
              ),
            );
          },
          error: (_, __) {
            return MyErrorWidget(
              refreshCallBack: () => loadData(),
            );
          },
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(
              fontSize: 20.0,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class FeaturedSection extends StatelessWidget {
  final CategoryFeed popular;

  const FeaturedSection({super.key, required this.popular});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200.0,
      child: Center(
        child: ListView.builder(
          primary: false,
          padding: const EdgeInsets.symmetric(horizontal: 15.0),
          scrollDirection: Axis.horizontal,
          itemCount: popular.feed?.entry?.length ?? 0,
          shrinkWrap: true,
          itemBuilder: (BuildContext context, int index) {
            final Entry entry = popular.feed!.entry![index];
            return Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 5.0, vertical: 10.0),
              child: BookCard(
                img: entry.link![1].href!,
                entry: entry,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _GenreSection extends StatelessWidget {
  final CategoryFeed popular;

  const _GenreSection({required this.popular});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50.0,
      child: Center(
        child: ListView.builder(
          primary: false,
          padding: const EdgeInsets.symmetric(horizontal: 15.0),
          scrollDirection: Axis.horizontal,
          itemCount: popular.feed?.link?.length ?? 0,
          shrinkWrap: true,
          itemBuilder: (BuildContext context, int index) {
            final Link link = popular.feed!.link![index];

            // We don't need the tags from 0-9 because
            // they are not categories
            if (index < 10) {
              return const SizedBox.shrink();
            }

            return Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 5.0,
                vertical: 10.0,
              ),
              child: Container(
                decoration: BoxDecoration(
                  color: context.theme.colorScheme.secondary,
                  borderRadius: const BorderRadius.all(
                    Radius.circular(20.0),
                  ),
                ),
                child: InkWell(
                  borderRadius: const BorderRadius.all(
                    Radius.circular(20.0),
                  ),
                  onTap: () {
                    final route = GenreRoute(
                      title: '',
                      url: link.href!,
                    );
                    if (context.isLargeScreen) {
                      context.router.replace(route);
                    } else {
                      context.router.push(route);
                    }
                  },
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0),
                      child: Text(
                        '',
                        style: const TextStyle(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _NewSection extends StatelessWidget {
  final CategoryFeed recent;

  const _NewSection({required this.recent});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      primary: false,
      padding: const EdgeInsets.symmetric(horizontal: 15.0),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: recent.feed?.entry?.length ?? 0,
      itemBuilder: (BuildContext context, int index) {
        final Entry entry = recent.feed!.entry![index];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10.0),
          child: BookListItem(entry: entry),
        );
      },
    );
  }
}

class OldSection extends StatelessWidget {
  final CategoryFeed oldBooks;
  const OldSection(this.oldBooks);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      primary: false,
      padding: const EdgeInsets.symmetric(horizontal: 15.0),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: oldBooks.feed?.entry?.length ?? 0,
      itemBuilder: (BuildContext context, int index) {},
    );
  }
}

enum AuthEvent { signIn, signOut, deleteUser }

class AuthBloc extends Bloc<AuthEvent, bool> {
  AuthBloc() : super(false) {
    on<AuthEvent>((event, emit) async {
      switch (event) {
        case AuthEvent.signIn:
          try {
            UserCredential userCredential = await FirebaseAuth.instance
                .signInWithPopup(GoogleAuthProvider.credential());
            emit(true);
          } catch (e) {
            emit(false);
          }
          break;

        case AuthEvent.signOut:
          FirebaseAuth.instance.signOut();
          break;
        case AuthEvent.deleteUser:
          FirebaseAuth.instance.currentUser!.delete();
      }
    });
  }
}

enum FileStorageEvent { uploadFile, downloadFile, deleteFile }`;
    const refactoredCode = `      itemBuilder: (BuildContext context, int index) {
      final Entry entry = recent.feed!.entry![index];
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 10.0),
        child: BookListItem(entry: entry),
      );
    },
  );
}
}

class OldSection extends StatelessWidget {
      final CategoryFeed oldBooks;
    
      const OldSection(this.oldBooks);
    
      @override
      Widget build(BuildContext context) {
        return ListView.builder(
          primary: false,
          padding: const EdgeInsets.symmetric(horizontal: 15.0),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: oldBooks.feed?.entry?.length ?? 0,
          itemBuilder: (BuildContext context, int index) {
            final Entry entry = oldBooks.feed!.entry![index];
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 10.0),
              child: BookListItem(entry: entry),
            );
          },
        );
      }
    }
    
    enum AuthEvent { signIn, signOut, deleteUser }

class AuthBloc extends Bloc<AuthEvent, bool> {
  AuthBloc() : super(false) {
    on<AuthEvent>((event, emit) async {
      switch (event) {
        case AuthEvent.signIn:
          try {
            UserCredential userCredential = await FirebaseAuth.instance
                .signInWithPopup(GoogleAuthProvider.credential());
            emit(true);
          } catch (e) {
            emit(false);
          }
          break;`;
    const startLine = 234;
    console.log(refactoredCode);
    const endLine = 249;
    const value = filterSurroundingCode(fileCode, refactoredCode, startLine, endLine);
    console.log(value);

  });

});
