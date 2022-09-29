import "firebase/compat/firestore";

import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc,
  doc, getDoc, getDocs, getFirestore, increment, limit, orderBy,
  query, runTransaction, serverTimestamp, setDoc, startAfter,
  updateDoc, where, writeBatch,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword, getAuth, indexedDBLocalPersistence,
  initializeAuth, sendPasswordResetEmail, signInWithEmailAndPassword,
  signOut, updateProfile,
} from "firebase/auth";
import {
  get, getDatabase,
  increment as rtdbIncrement,
  runTransaction as rtdbRunTransaction,
  set, update
} from "firebase/database";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from 'firebase/functions';

import { Capacitor } from '@capacitor/core';
import SpotifyWebApi from 'spotify-web-api-js';
import { initializeApp } from "firebase/app";
import { ref as rtdbRef } from "firebase/database";

export const spotifyApi = new SpotifyWebApi();

const firebaseConfig = {
  apiKey: `${process.env.REACT_APP_FIREBASE_API_KEY}`,
  authDomain: `${process.env.REACT_APP_FIREBASE_AUTH_DOMAIN}`,
  databaseURL: `${process.env.REACT_APP_FIREBASE_DATABASE_URL}`,
  projectId: `${process.env.REACT_APP_FIREBASE_PROJECT_ID}`,
  storageBucket: `${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}`,
  messagingSenderId: `${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}`,
  appId: `${process.env.REACT_APP_FIREBASE_APP_ID}`,
  measurementId: `${process.env.REACT_APP_FIREBASE_MEASUREMENT_ID}`,
};

export const app = initializeApp(firebaseConfig);
const auth = Capacitor.isNativePlatform ?
  initializeAuth(app, {
    persistence: indexedDBLocalPersistence
  }) :
  getAuth();
export default auth;
export const functions = getFunctions(app);
export const db = getFirestore(app);
export const storage = getStorage();
export const database = getDatabase();

// cloud functions
export const deletePoll = httpsCallable(functions, 'deletePoll');
export const deleteImage = httpsCallable(functions, 'deleteImage');
export const deleteLikesDocFromRtdb = httpsCallable(functions, 'deleteLikesDocFromRtdb');
export const deleteCommentsFromDeletedPost = httpsCallable(functions, 'deleteCommentsFromDeletedPost');
export const sendEmailOnReport = httpsCallable(functions, 'sendEmailOnReport');

export const getNewsArticles = async (schoolName) => {
  try {
    if (db) {
      const newsDocRef = doc(db, "schoolNews", schoolName.replace(/\s+/g, ""));
      const snap = await getDoc(newsDocRef);
      if (snap.exists()) {
        return {
          schoolArticles : snap.data().schoolArticles,
          localArticles : snap.data().localArticles
        }
      }
    }
  } catch(err) {
    console.error(err);
  }
}

export const testNewsUpdates = async () => {
  const apiKey = '8b14944f22e147c8a9f16104c71461e9';
  const option = {
    mode: "cors",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey
    }
  };
  const res1 = await fetch('https://api.bing.microsoft.com/v7.0/news/search?q=Humboldt%20County&mkt=en-US', option);
  const humboldtCountyNews = await res1.json();
  const res2 = await fetch('https://api.bing.microsoft.com/v7.0/news/search?q=Cal%20Poly%20Humboldt&mkt=en-US', option);
  const humboldtStateNews = await res2.json();

  console.log(humboldtCountyNews);
  console.log(humboldtStateNews);

  let articles = [];
  if (humboldtCountyNews && "value" in humboldtCountyNews && Array.isArray(humboldtCountyNews.value)) {
    let arrSize = humboldtCountyNews.value.length;
    if(arrSize > 5) {
      arrSize = 5;
    }
    for (let i = 0; i < arrSize; ++i) {
      let temp = {};
      if ("image" in humboldtCountyNews.value[i] && "thumbnail" in humboldtCountyNews.value[i].image && "contentUrl" in humboldtCountyNews.value[i].image.thumbnail) {
        temp['image'] = humboldtCountyNews.value[i].image.thumbnail.contentUrl;
      } else {
        temp['image'] = '';
      }
      if("name" in humboldtCountyNews.value[i])
        temp['title'] = humboldtCountyNews.value[i].name;
      if("url" in humboldtCountyNews.value[i])
        temp['url'] = humboldtCountyNews.value[i].url;
      // temp['info'] = humboldtCountyNews.value[i].description;
      if("datePublished" in humboldtCountyNews.value[i])
        temp['date'] = humboldtCountyNews.value[i].datePublished;
      articles.push(temp);
    }
  }

  console.log(articles);

  let schoolArticles = [];
  if (humboldtStateNews && "value" in humboldtStateNews && Array.isArray(humboldtStateNews.value)) {
    let arrSize = humboldtStateNews.value.length;
    if(arrSize > 10){
      arrSize = 10;
    }
    for (let i = 0; i < arrSize; ++i) {
      let temp = {};
      if ("image" in humboldtStateNews.value[i] && "thumbnail" in humboldtStateNews.value[i].image && "contentUrl" in humboldtStateNews.value[i].image.thumbnail) {
        temp['image'] = humboldtStateNews.value[i].image.thumbnail.contentUrl;
      } else {
        temp['image'] = '';
      }
      if("name" in humboldtStateNews.value[i])
        temp['title'] = humboldtStateNews.value[i].name;
      if("url" in humboldtStateNews.value[i])
        temp['url'] = humboldtStateNews.value[i].url;
      // temp['info'] = humboldtCountyNews.value[i].description;
      if("datePublished" in humboldtStateNews.value[i])
        temp['date'] = humboldtStateNews.value[i].datePublished;
      schoolArticles.push(temp);
    }
  }
  console.log(schoolArticles);
}

export const spotifySearch = async (query) => {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: 'grant_type=client_credentials&client_id=' + `${process.env.REACT_APP_SPOTIFY_CLIENT_ID}` + '&client_secret=' + `${process.env.REACT_APP_SPOTIFY_SECRET_ID}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).catch((err) => {
      console.log(err);
    });
    const data = await res.json().catch((err) => { console.log(err); });
    const token = data.access_token;
    spotifyApi.setAccessToken(token);
    const searchResults = await spotifyApi.search(query, ["track"], { limit: 25 });
    return searchResults.tracks.items;
  } catch (err) {
    console.log(err);
  }
};

export async function uploadImage(location, blob, url) {
  try {
    const currentUserUid = auth.currentUser.uid;
    const storageRef = ref(
      storage,
      location + "/" + currentUserUid.toString() + url
    );

    const res = await uploadBytes(storageRef, blob)
      .then((snapshot) => {
        return true;
      })
      .catch((err) => {
        console.log(err);
        return false;
      });
  } catch (err) {
    console.log(err.message);
    return false;
  }
}

export async function logInWithEmailAndPassword(email, password) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res;
  } catch (err) {
    console.log(err);
  }
}

export async function registerWithEmailAndPassword(
  name,
  email,
  password,
  school
) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const batch = writeBatch(db);
    if (res) {
      const user = res.user;
      await updateProfile(user, {
        displayName: name,
        photoURL:
          "https://firebasestorage.googleapis.com/v0/b/quantum-61b84.appspot.com/o/profilePictures%2F301-3012952_this-free-clipart-png-design-of-blank-avatar.png?alt=media&token=90117292-9497-4b30-980e-2b17986650cd",
      });
      try {
        // batch.set(doc(db, "userData", user.uid.toString()), {
        //   bio: "",
        //   snapchat: "",
        //   instagram: "",
        //   tiktok: "",
        //   spotify: "",
        //   userName: name,
        //   userEmail: email,
        //   uid: user.uid,
        //   school: school,
        //   timestamp: serverTimestamp(),
        // });
        await setDoc(doc(db, "userData", user.uid.toString()), {
          bio: "",
          snapchat: "",
          instagram: "",
          tiktok: "",
          spotify: "",
          userName: name,
          userEmail: email,
          uid: user.uid,
          school: school,
          timestamp: serverTimestamp(),
        });
        // batch.set(doc(db, "userPhotoUrls", user.uid.toString()), {
        //   url: "https://firebasestorage.googleapis.com/v0/b/quantum-61b84.appspot.com/o/profilePictures%2F301-3012952_this-free-clipart-png-design-of-blank-avatar.png?alt=media&token=90117292-9497-4b30-980e-2b17986650cd"
        // });
        await setDoc(doc(db, "userPhotoUrls", user.uid.toString()), {
          url: "https://firebasestorage.googleapis.com/v0/b/quantum-61b84.appspot.com/o/profilePictures%2F301-3012952_this-free-clipart-png-design-of-blank-avatar.png?alt=media&token=90117292-9497-4b30-980e-2b17986650cd"
        });
        // await batch.commit().catch((err) => {console.log(err);});
      } catch (docErr) {
        console.log(docErr);
      }
      return res;
    }
  } catch (err) {
    return err.message.toString();
  }
}

export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    console.error(err);
  }
};

export const logout = async () => {
  try {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf("=");
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    await signOut(auth);
    return true;
  } catch (err) {
    const theError = err.message.toString();
    window.location.reload();
    return theError;
  }
};

export function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(function (user) {
      if (user) {
        resolve(user);
      } else {
        resolve(null);
      }
      unsubscribe();
    });
  });
}

export const getLikes = async (key) => {
  try {
    const likesRef = rtdbRef(database, key);
    const snapshot = await get(likesRef);
    return snapshot.val();
  } catch (err) {
    console.log(err);
  }
};

function randomInRange(min, max) {
  return Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);
}

export const addMessage = async (
  mess,
  blob,
  id,
  pos,
  school,
  postType = "general"
) => {
  try {
    if (auth.currentUser != null) {
      if (auth.currentUser.uid != null) {
        var name = auth.currentUser.displayName;
        var url = "";
        let imgSrc = "";
        let lat = 0;
        let long = 0;
        let marker = false;
        if (blob) {
          url = "images/" + auth.currentUser.uid.toString() + id;
          imgSrc = await getDownloadURL(ref(storage, url));
        }
        if (pos) {
          lat = pos.coords.latitude;
          long = pos.coords.longitude;
          marker = true;
        }
        const docId = await addDoc(
          collection(db, "schoolPosts", school.replace(/\s+/g, ""), "allPosts"),
          {
            userName: name,
            timestamp: serverTimestamp(),
            message: mess,
            url: url,
            uid: auth.currentUser.uid,
            location: [lat, long],
            postType: postType,
            imgSrc: imgSrc,
            marker: marker,
          }
        );

        await set(rtdbRef(database, docId.id), {
          likes: {
            'null': true
          },
          dislikes: {
            'null': true
          },
          commentAmount: 0,
        }).catch((err) => {
          console.log(err);
        });

        return "true";
      } else {
        console.log("uid missing");
      }
    } else {
      console.log("currentUser missing");
    }
  } catch (err) {
    console.log(err.message);
    return "false";
  }
};

export async function checkUsernameUniqueness(userName) {
  try {
    if (db) {
      const usersRef = collection(db, "userData");
      const q = query(usersRef, where("userName", "==", userName));
      const snap = await getDocs(q);
      if (snap.empty) {
        return true;
      }
    } else {
      console.log("auth not defined");
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export const getYourPolls = async (schoolName, userUid) => {
  try {
    if (auth && db) {
      const pollsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "polls");
      const q = query(pollsRef, where("uid", "==", userUid), orderBy("timestamp", "desc"), limit(25));
      const querySnapshot = await getDocs(q);
      let yourPolls = [];
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        yourPolls.push({
          ...doc.data(),
          key: doc.id,
        });
      }
      return yourPolls;
    }
  } catch (err) {
    console.log(err);
  }
}

export async function getAllPostsNextBatch(schoolName, key) {
  try {
    if (auth.currentUser != null && db) {
      const allPostsRef = collection(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts"
      );
      const q = query(allPostsRef, orderBy("timestamp", "desc"), startAfter(key), limit(25));
      const querySnapshot = await getDocs(q);
      const allPosts = [];
      const docs = querySnapshot.docs;
      let lastKey = "";
      for (const doc of docs) {
        allPosts.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { allPosts, lastKey };
      // return tempArr;
    }
  } catch (err) {
    console.log(err);
    let allPosts = [];
    let lastKey = "";
    return { allPosts, lastKey };
  }
}

export async function getAllPosts(schoolName) {
  try {
    if (auth.currentUser != null && db) {
      const allPostsRef = collection(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts"
      );
      const q = query(allPostsRef, orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const allPosts = [];
      const docs = querySnapshot.docs;
      let lastKey = "";
      for (const doc of docs) {
        allPosts.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { allPosts, lastKey };
    }
  } catch (err) {
    console.log(err);
    let allPosts = [];
    let lastKey = "";
    return { allPosts, lastKey };
  }
}

export const promiseTimeout = function (ms, promise) {
  let timeout = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      let rejectStr = "Request timed out (" + ms + " ms)";
      reject(rejectStr);
    }, ms);
  });
  return Promise.race([promise, timeout]);
};

export const getUserLikedPosts = async (uid) => {
  try {
    const userLikesRef = collection(db, "userData", uid, "likes");
    const q = query(userLikesRef, orderBy("likeTimestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    let userLikes = [];
    let lastKey = "";
    const docs = querySnapshot.docs;
    for (const doc of docs) {
      userLikes.push({
        ...doc.data(),
        key: doc.id,
      });
      lastKey = doc.data().likeTimestamp;
    }
    return { userLikes, lastKey };
  } catch (err) {
    console.log(err);
  }
}

export const getUserLikedPostsNextBatch = async (uid, key) => {
  try {
    const userLikesRef = collection(db, "userData", uid, "likes");
    const q = query(userLikesRef, orderBy("likeTimestamp", "desc"), startAfter(key), limit(10));
    const querySnapshot = await getDocs(q);
    let userLikes = [];
    let lastKey = "";
    const docs = querySnapshot.docs;
    for (const doc of docs) {
      userLikes.push({
        ...doc.data(),
        key: doc.id,
      });
      lastKey = doc.data().likeTimestamp;
    }
    return { userLikes, lastKey };
  } catch (err) {
    console.log(err);
  }
}

export const updateUserInfo = async (bio, instagram, major, snapchat, tiktok, spotifyUri) => {
  try {
    if (db && auth && auth.currentUser) {
      const uid = auth.currentUser.uid;
      const batch = writeBatch(db);
      const userDocRef = doc(db, "userData", uid);
      if (!bio) { bio = ""; }
      if (!instagram) { instagram = ""; }
      if (!major) { major = ""; }
      if (!snapchat) { snapchat = ""; }
      if (!tiktok) { tiktok = ""; }
      if (!spotifyUri) { spotifyUri = "" }
      batch.update(userDocRef, {
        bio: bio,
        instagram: instagram,
        major: major,
        snapchat: snapchat,
        tiktok: tiktok,
        spotify: spotifyUri,
      });
      await batch.commit().catch((err) => console.log(err));
      return true;
    }
  } catch (err) {
    console.log(err);
  }
}

export const getUserPosts = async (schoolName, uid) => {
  try {
    if (db) {
      const userPostsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "allPosts");
      const q = query(userPostsRef, orderBy("timestamp", "desc"), where("uid", "==", uid), limit(10));
      const qSnap = await getDocs(q);
      let userPosts = [];
      let lastKey = "";
      const docs = qSnap.docs;
      for (const doc of docs) {
        userPosts.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { userPosts, lastKey };
    }
  } catch (err) {
    console.log(err);
  }
}

export const getNextBatchUserPosts = async (schoolName, uid, key) => {
  try {
    if (db) {
      const userPostsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "allPosts");
      const q = query(userPostsRef, orderBy("timestamp", "desc"), where("uid", "==", uid), startAfter(key), limit(5));
      const qSnap = await getDocs(q);
      let userPosts = [];
      let lastKey = "";
      const docs = qSnap.docs;
      for (const doc of docs) {
        userPosts.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { userPosts, lastKey };
    }
  } catch (err) {
    console.log(err);
  }
}

export const getOnePost = async (postKey, schoolName) => {
  try {
    if (db) {
      const postDocRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts",
        postKey
      );
      const snap = await getDoc(postDocRef);
      if (snap.exists) {
        return snap.data();
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const getCurrentUserData = async () => {
  try {
    if (db && auth && auth.currentUser) {
      const uid = auth.currentUser.uid;
      const userDoc = doc(db, "userData", uid);
      const res = await getDoc(userDoc);
      if (res.exists) {
        return res.data();
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const getUserData = async (uid) => {
  try {
    if (auth && db) {
      const usersRef = doc(db, "userData", uid.toString());
      const res = await getDoc(usersRef);
      if (res.exists()) {
        return { ...res.data(), key: doc.id }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const getNextBatchUsers = async (key) => {
  try {
    if (auth && db) {
      const usersRef = collection(db, "userData");
      const q = query(
        usersRef,
        orderBy("userName", "asc"),
        startAfter(key),
        limit(2)
      );
      const querySnapshot = await getDocs(q);
      let userList = [];
      let lastKey = "";
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        console.log(doc);
        userList.push({
          key: doc.id,
          data: doc.data(),
        });
        lastKey = doc.data().userName;
      }
      return { userList, lastKey };
    }
  } catch (err) {
    console.log(err);
  }
};

export const getOnePoll = async (schoolName, pollKey) => {
  try {
    if (db) {
      const pollDocRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "polls",
        pollKey
      );
      const snap = await getDoc(pollDocRef);
      if (snap.exists) {
        return snap.data();
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const getPolls = async (schoolName) => {
  try {
    if (auth && db) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 4);
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      tomorrow.setDate(sevenDaysAgo.getDate() + 6);
      const pollsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "polls");
      const q = query(pollsRef, where("timestamp", ">", sevenDaysAgo), where("timestamp", "<", tomorrow), orderBy("timestamp", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      let polls = [];
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        polls.push({
          ...doc.data(),
          key: doc.id,
        });
      }
      return polls;
    }
  } catch (err) {
    console.log(err);
  }
}

export const submitShowcase = async (schoolName, blob, uniqueId, showcaseText) => {
  try {
    if (auth.currentUser != null) {
      if (auth.currentUser.uid != null) {
        var name = auth.currentUser.displayName;
        var url = "";
        let imgSrc = "";
        if (blob) {
          url = "images/" + auth.currentUser.uid.toString() + uniqueId;
          imgSrc = await getDownloadURL(ref(storage, url));
        }
        await addDoc(
          collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "showcase"),
          {
            userName: name,
            timestamp: serverTimestamp(),
            message: showcaseText,
            url: url,
            likes: {},
            dislikes: {},
            uid: auth.currentUser.uid,
            commentAmount: 0,
            upVotes: 0,
            downVotes: 0,
            // photoURL: auth.currentUser.photoURL,
            imgSrc: imgSrc,
          }
        );
        return true;
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const submitPollFb = async (pollText, pollOptions, schoolName, userName, userUid) => {
  try {
    if (auth && db) {
      const pollsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "polls");
      await addDoc(pollsRef, {
        question: pollText,
        options: pollOptions,
        userName: userName,
        timestamp: serverTimestamp(),
        votes: 0,
        voteMap: {},
        results: [0, 0, 0, 0, 0, 0],
        uid: userUid,
      }).catch((err) => {
        console.log(err);
        return false;
      });
      return true;
    }
  } catch (err) {
    console.log(err);
  }
}

export const getShowcase = async (schoolName) => {
  try {
    if (auth && db) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 2);
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      tomorrow.setDate(sevenDaysAgo.getDate() + 4);
      const showcaseRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "showcase");
      const q = query(showcaseRef, where("timestamp", ">", sevenDaysAgo), where("timestamp", "<", tomorrow), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      let showcase = [];
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        showcase.push({
          ...doc.data(),
          key: doc.id,
        });
      }
      return showcase;
    }
  } catch (err) {
    console.log(err);
  }
}

export const getTopWeeklyPosts = async (schoolName) => {
  try {
    if (auth && db) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      tomorrow.setDate(sevenDaysAgo.getDate() + 9);
      const allPostsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "allPosts");
      const q = query(allPostsRef, where("timestamp", ">", sevenDaysAgo), where("timestamp", "<", tomorrow), limit(15));
      const querySnapshot = await getDocs(q);
      let topWeeklyPosts = [];
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        topWeeklyPosts.push({
          key: doc.id,
          data: doc.data(),
        });
      }
      return topWeeklyPosts;
    }
  } catch (err) {
    console.log(err);
  }
}

export const getTopPostsWithinPastDay = async (schoolName) => {
  try {
    if (auth && db) {
      const allPostsRef = collection(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts"
      );
      const q = query(allPostsRef, orderBy("upVotes", "desc"), limit(15));
      const querySnapshot = await getDocs(q);
      const topPosts = [];
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        topPosts.push({
          key: doc.id,
          data: doc.data(),
        });
      }
      return topPosts;
    }
  } catch (err) {
    console.log(err);
  }
};

export const getWeatherData = async (schoolName) => {
  try {
    if (db) {
      const weatherDocRef = doc(db, "schoolWeather", schoolName.replace(/\s+/g, ""));
      const snap = await getDoc(weatherDocRef);
      if (snap.exists()) {
        const weatherData = {};
        weatherData.feelsLike = snap.data().feelsLike;
        weatherData.humidity = snap.data().humidity;
        weatherData.icon = snap.data().icon;
        weatherData.index = snap.data().index;
        weatherData.temp = snap.data().temp;
        weatherData.text = snap.data().text;
        weatherData.location = snap.data().location;
        return weatherData;
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const pollVote = async (schoolName, index, postKey, userUid) => {
  try {
    if (auth && db) {
      let hasVoted = false;
      const pollsDocRef = doc(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "polls", postKey);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(pollsDocRef);
        if (snap.exists) {
          if ("voteMap" in snap.data() && snap.data().voteMap[userUid] === undefined) {
            let tempResults = [...snap.data().results];
            tempResults[index] += 1;
            transaction.update(pollsDocRef, {
              [`voteMap.${userUid}`]: index,
              votes: increment(1),
              results: tempResults,
            });
            hasVoted = true;
          }
        }
      });
      return hasVoted;
    }
  } catch (err) {
    console.log(err);
  }
}

export const downVoteComment = async (commentKey) => {
  try {
    if (auth && auth.currentUser) {
      let inc = null;
      const userUid = auth.currentUser.uid;
      let deleteLike = false;
      const likesRef = rtdbRef(database, commentKey);
      await rtdbRunTransaction(likesRef, (post) => {
        if (post && post.likes && post.dislikes) {
          if (post.dislikes[userUid]) { // if disliked before
            post.dislikes[userUid] = null;
            inc = -1;
          } else {
            if (!post.dislikes) {
              post.dislikes = {};
            }
            if (post.likes[userUid]) { // if liked before
              post.likes[userUid] = null;
              deleteLike = true;
            }
            inc = 1;
            post.dislikes[userUid] = true;
          }
        }
        return post;
      });
      return inc;
    }
  } catch (err) {
    console.log(err);
  }
}

export const upVoteComment = async (commentKey) => {
  try {
    if (db && database && auth && auth.currentUser) {
      let inc = null;
      const userUid = auth.currentUser.uid;
      const likesRef = rtdbRef(database, commentKey);
      await rtdbRunTransaction(likesRef, (post) => {
        if (post && post.likes && post.dislikes) {
          if (post.likes[userUid]) { // if liked before
            post.likes[userUid] = null;
            inc = -1;
          } else {
            if (!post.likes) {
              post.likes = {};
            }
            if (post.dislikes[userUid]) { // if disliked before
              post.dislikes[userUid] = null;
            }
            inc = 1;
            post.likes[userUid] = true;
          }
        }
        return post;
      });
      return inc;
    }
  } catch (err) {
    console.log(err);
  }
}

export const upVote = async (postKey, post) => {
  try {
    if (db && database && auth && auth.currentUser) {
      let inc = null;
      const userUid = auth.currentUser.uid;
      const userLikesDocRef = doc(
        db,
        "userData",
        userUid,
        "likes",
        postKey
      );
      let deleteLike = false;
      const likesRef = rtdbRef(database, postKey);
      await rtdbRunTransaction(likesRef, (post) => {
        if (post && post.likes && post.dislikes) {
          if (post.likes[userUid]) { // if liked before
            post.likes[userUid] = null;
            deleteLike = true;
            inc = -1;
          } else {
            if (!post.likes) {
              post.likes = {};
            }
            if (post.dislikes[userUid]) { // if disliked before
              post.dislikes[userUid] = null;
            }
            inc = 1;
            post.likes[userUid] = true;
          }
        }
        return post;
      });
      if (deleteLike) {
        await deleteDoc(userLikesDocRef);
      } else { // add to liked posts
        await setDoc(userLikesDocRef, {
          imgSrc: post.imgSrc,
          message: post.message,
          // photoURL: post.photoURL,
          timestamp: post.timestamp,
          likeTimestamp: serverTimestamp(),
          uid: post.uid,
          userName: post.userName,
          postType: post.postType,
        });
      }
      return inc;
    }
  } catch (err) {
    console.log(err);
  }
};

export const downVote = async (postKey) => {
  try {
    if (auth && auth.currentUser) {
      let inc = null;
      const userUid = auth.currentUser.uid;
      const userLikesDocRef = doc(
        db,
        "userData",
        userUid,
        "likes",
        postKey
      );
      let deleteLike = false;
      const likesRef = rtdbRef(database, postKey);
      await rtdbRunTransaction(likesRef, (post) => {
        if (post && post.likes && post.dislikes) {
          if (post.dislikes[userUid]) { // if disliked before
            post.dislikes[userUid] = null;
            inc = -1;
          } else {
            if (!post.dislikes) {
              post.dislikes = {};
            }
            if (post.likes[userUid]) { // if liked before
              post.likes[userUid] = null;
              deleteLike = true;
            }
            inc = 1;
            post.dislikes[userUid] = true;
          }
        }
        return post;
      });
      if (deleteLike) {
        await deleteDoc(userLikesDocRef);
      }
      return inc;
    }
  } catch (err) {
    console.log(err);
  }
};
///schoolPosts/UCBerkeley/allPosts/IsfZKvyHB9pWIElkzzDt/comments
export const addCommentNew = async (postKey, schoolName, commentString, blob, id) => {
  try {
    if (auth && database && auth.currentUser && db) {
      const uid = auth.currentUser.uid;
      const userName = auth.currentUser.displayName;
      const photoURL = auth.currentUser.photoURL;
      const commentsRef = collection(db, "schoolPosts", schoolName.replace(/\s+/g, ""),
        "allPosts", postKey, "comments");
      const postRef = doc(db, "schoolPosts", schoolName.replace(/\s+/g, ""), "allPosts", postKey);
      let url = "";
      let imgSrc = "";
      if (blob) {
        url = "commentImages/" + auth.currentUser.uid.toString() + id;
        imgSrc = await getDownloadURL(ref(storage, url));
      }
      const addedDoc = await addDoc(commentsRef, {
        comment: commentString,
        // photoURL: photoURL,
        userName: userName,
        uid: uid,
        timestamp: serverTimestamp(),
        url: url,
        imgSrc: imgSrc
      });
      await set(rtdbRef(database, addedDoc.id), {
        likes: {
          'null': true
        },
        dislikes: {
          'null': true
        },
      });
      const likesRef = rtdbRef(database, postKey);
      await update(likesRef, {
        commentAmount: rtdbIncrement(1)
      });
      return {
        comment: commentString,
        // photoURL: photoURL,
        userName: userName,
        uid: uid,
        likes: {},
        dislikes: {},
        timestamp: serverTimestamp(),
        key: addedDoc.id,
        url: url,
        imgSrc: imgSrc
      };
    }
  } catch (err) {
    console.log(err);
  }
}

export const addComment = async (postKey, schoolName, commentString) => {
  try {
    if (auth && auth.currentUser) {
      const userUid = auth.currentUser.uid;
      const userName = auth.currentUser.displayName;
      const photoURL = auth.currentUser.photoURL;
      const postRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts",
        postKey
      );
      const postDocRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "comments",
        postKey
      );
      const commentSnap = await getDoc(postDocRef);
      if (commentSnap.exists && commentSnap.data().commentsArr) {
        await updateDoc(postDocRef, {
          commentsArr: arrayUnion({
            comment: commentString,
            // photoURL: photoURL,
            userName: userName,
            upVotes: 0,
            downVotes: 0,
            uid: userUid,
          })
        });
        const postSnap = await getDoc(postRef);
        if (postSnap.exists) {
          await updateDoc(postRef, {
            commentAmount: increment(1),
          });
          return true;
        } else {
          console.log(postSnap.data());
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const removePoll = async (postKey, schoolName) => {
  try {
    // await deletePoll({
    //   schoolName: schoolName.replace(/\s+/g, ""),
    //   postKey: postKey,
    // }).catch((err) => console.log(err));
    // return true;
    const postRef = doc(
      db,
      "schoolPosts",
      schoolName.replace(/\s+/g, ""),
      "polls",
      postKey
    );
    const batch = writeBatch(db);
    batch.delete(postRef);
    await batch.commit().catch((err) => console.log(err));
    return true;
  } catch (err) {
    console.log(err);
  }
}

export const removePost = async (postKey, schoolName, postUrl) => {
  try {
    if (postUrl.length > 0) {
      deleteImage({ // cloud function to delete images attached to post
        path: postUrl
      }).catch((err) => {
        console.log(err);
      });
    }
    deleteLikesDocFromRtdb({ // cloud function to delete rtdb document containing likes information
      key: postKey
    });
    deleteCommentsFromDeletedPost({ // cloud function to delete all comments made on post
      key: postKey,
      schoolName: schoolName.replace(/\s+/g, ""),
    });

    const postRef = doc(
      db,
      "schoolPosts",
      schoolName.replace(/\s+/g, ""),
      "allPosts",
      postKey
    );
    await deleteDoc(postRef).catch((err) => { console.log(err); });
    return true;
  } catch (err) {
    console.log(err);
  }
}

export const removeCommentNew = async (comment, schoolName, postKey, commentUrl) => {
  try {
    if (db) {
      if (commentUrl.length > 0) {
        deleteImage({
          path: commentUrl
        }).catch((err) => {
          console.log(err);
        })
      }
      deleteLikesDocFromRtdb({
        key: comment.key,
      });
      const commentRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts",
        postKey,
        "comments",
        comment.key,
      );
      await deleteDoc(commentRef).catch((err) => { console.log(err); });
      const likesRef = rtdbRef(database, postKey);
      update(likesRef, {
        commentAmount: rtdbIncrement(-1)
      });
      return true;
    }
  } catch (err) {
    console.log(err);
  }
}

export const removeComment = async (comment, schoolName, postKey) => {
  try {
    const postRef = doc(
      db,
      "schoolPosts",
      schoolName.replace(/\s+/g, ""),
      "allPosts",
      postKey
    );
    const postDocRef = doc(
      db,
      "schoolPosts",
      schoolName.replace(/\s+/g, ""),
      "comments",
      postKey
    );
    const commentSnap = await getDoc(postDocRef);
    if (commentSnap.exists) {
      await updateDoc(postDocRef, {
        commentsArr: arrayRemove(comment)
      });
      const postSnap = await getDoc(postRef);
      if (postSnap.exists) {
        await updateDoc(postRef, {
          commentAmount: increment(-1),
        });
        return true;
      } else {
        console.log(postSnap.data());
      }
    }
  } catch (err) {
    console.log(err);
  }

}
// /schoolPosts/UCDavis/allPosts/xGhnEiKAGyMSbiQIDPeW/comments/5nVNdPGw0lAJBCSH3l0i
export const loadCommentsNew = async (postKey, schoolName) => {
  try {
    if (auth && auth.currentUser) {
      const commentsRef = collection(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts",
        postKey,
        "comments"
      );
      const q = query(commentsRef, orderBy("timestamp", "asc"), limit(20));
      const querySnapshot = await getDocs(q);
      let comments = [];
      let lastKey = "";
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        comments.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { comments, lastKey };
    }
  } catch (err) {
    console.log(err);
  }
}

export const loadCommentsNewNextBatch = async (postKey, schoolName, key) => {
  try {
    if (auth && auth.currentUser) {
      const commentsRef = collection(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "allPosts",
        postKey,
        "comments"
      );
      const q = query(commentsRef, orderBy("timestamp", "asc"), startAfter(key), limit(20));
      const querySnapshot = await getDocs(q);
      let comments = [];
      let lastKey = "";
      const docs = querySnapshot.docs;
      for (const doc of docs) {
        comments.push({
          ...doc.data(),
          key: doc.id,
        });
        lastKey = doc.data().timestamp;
      }
      return { comments, lastKey };
    }
  } catch (err) {
    console.log(err);
  }
}

export const loadComments = async (postKey, schoolName) => {
  try {
    if (auth && auth.currentUser) {
      const postDocRef = doc(
        db,
        "schoolPosts",
        schoolName.replace(/\s+/g, ""),
        "comments",
        postKey
      );
      const snap = await getDoc(postDocRef);
      if (snap.exists) {
        if (snap.data()) return snap.data().commentsArr;
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const getCommunityWidgets = async (schoolName) => {
  try {
    if (auth && auth.currentUser) {
      const widgetsRef = doc(db, "schoolWidgets", schoolName.replace(/\s+/g, ""));
      const snap = await getDoc(widgetsRef);
      if (snap.exists) {
        return snap.data().widgets;
      }
    }
  } catch (err) {
    console.log(err);
  }
}

export const sendReportStatus = async (message, schoolName, postKey) => {
  try {
    if (auth && auth.currentUser) {
      const userUid = auth.currentUser.uid;
      const userEmail = auth.currentUser.email;
      sendEmailOnReport({ // cloud function to send email to me when someone reports a post
        key: postKey,
        reporterUid: userUid,
        reporterEmail: userEmail,
        schoolName: schoolName,
        message: message
      }).catch((err) => {
        console.log(err);
      });
      return true;
    }
  } catch (err) {
    console.error(err);
  }
}
