/* React imports */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from "react-router-dom";
import { useHistory } from 'react-router';
import { useDispatch, useSelector } from "react-redux"
import { setUserState } from '../redux/actions';

/* Ionic/Capacitor */
import { KeyboardResizeOptions, Keyboard, KeyboardResize } from "@capacitor/keyboard";
import {
  IonContent, IonHeader, IonButton,
  IonItem, IonSpinner, IonList, IonPage, IonLoading, IonLabel, useIonRouter, RouterDirection
} from '@ionic/react';

/* Firebase */
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import auth, { promiseTimeout, logInWithEmailAndPassword, db } from '../fbconfig';

/* CSS + Other components */
import '../App.css';
import Header from "./Header";
import { useTabsContext } from '../my-context';
import { useToast } from "@agney/ir-toast";

/* global variables */
const defaultResizeOptions: KeyboardResizeOptions = { mode: KeyboardResize.Body }

const LandingPage: React.FC = () => {

  // state variables
  const [busy, setBusy] = useState<boolean>(false);
  const [emailSignIn, setEmailSignIn] = useState("");
  const [passwordSignIn, setPasswordSignIn] = useState("");
  const [user, loading, error] = useAuthState(auth);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  const Toast = useToast();
  const history = useHistory();
  const dispatch = useDispatch();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tabs = useTabsContext();
  const router = useIonRouter();
  const darkModeToggled = useSelector((state: any) => state.darkMode.toggled);

  const dynamicNavigate = (path: string, direction: RouterDirection) => {
    const action = direction === "forward" ? "push" : "pop";
    router.push(path, direction, action);
  }

  /**
   * Uses Firebase Authentication to log user in based on
   * emailSignIn and passwordSignIn variables
   * 
   */
  async function logIn() {
    const emailRefValue = emailRef.current;
    const passwordRefValue = passwordRef.current;
    if (emailRefValue && passwordRefValue) {
      console.log("Logging in with refs");
      const email = emailRefValue.value;
      const password = passwordRefValue.value;
      if (email && password) {
        const didLogIn = promiseTimeout(10000, logInWithEmailAndPassword(email.toString().trim(), password));
        didLogIn.then((res) => {
          if (!res) {
            Toast.error("Unable to login");
            setBusy(false);
            setLoggingIn(false);
            return;
          }
          let school = "";
          const userRef = doc(db, "userData", res.user.uid);
          getDoc(userRef).then((userSnap) => {
            if (userSnap.exists()) {
              school = userSnap.data().school;
              localStorage.setItem("notificationsToken", userSnap.data().notificationsToken);
            }
            localStorage.setItem("userSchoolName", school.toString());
            dispatch(setUserState(res.user.displayName, res.user.email, false, school));
            Toast.success("Logged In!");
            tabs.setShowTabs(true);
          }).catch((err) => {
            console.log(err);
            dispatch(setUserState(res.user.displayName, res.user.email, false, ""));
            setBusy(false);
            setLoggingIn(false);
            tabs.setShowTabs(true);
          });
        });
        didLogIn.catch((err) => {
          Toast.error(err);
          setLoggingIn(false);
          setBusy(false);
        });
      } else {
        console.log("logging in with useState variables");
        const didLogIn = promiseTimeout(10000, logInWithEmailAndPassword(emailSignIn.trim(), passwordSignIn));
        didLogIn.then((res) => {
          if (!res) {
            Toast.error("Unable to login");
            setBusy(false);
            setLoggingIn(false);
            return;
          }
          let school = "";
          const userRef = doc(db, "userData", res.user.uid);
          getDoc(userRef).then((userSnap) => {
            if (userSnap.exists()) {
              school = userSnap.data().school;
              localStorage.setItem("notificationsToken", userSnap.data().notificationsToken);
            }
            localStorage.setItem("userSchoolName", school.toString());
            dispatch(setUserState(res.user.displayName, res.user.email, false, school));
            Toast.success("Logged In!");
          }).catch((err) => {
            console.log(err);
            dispatch(setUserState(res.user.displayName, res.user.email, false, ""));
            setBusy(false);
            setLoggingIn(false);
          });
        });
        didLogIn.catch((err) => {
          Toast.error(err);
          setLoggingIn(false);
          setBusy(false);
        });
      }
    } else {
      console.log("logging in with useState variables");
      const didLogIn = promiseTimeout(10000, logInWithEmailAndPassword(emailSignIn.trim(), passwordSignIn));
      didLogIn.then((res) => {
        if (!res) {
          Toast.error("Unable to login");
          setBusy(false);
          setLoggingIn(false);
          return;
        }
        let school = "";
        const userRef = doc(db, "userData", res.user.uid);
        getDoc(userRef).then((userSnap) => {
          if (userSnap.exists()) {
            school = userSnap.data().school;
            localStorage.setItem("notificationsToken", userSnap.data().notificationsToken);
          }
          localStorage.setItem("userSchoolName", school.toString());
          dispatch(setUserState(res.user.displayName, res.user.email, false, school));
          Toast.success("Logged In!");
        }).catch((err) => {
          console.log(err);
          dispatch(setUserState(res.user.displayName, res.user.email, false, ""));
          setBusy(false);
          setLoggingIn(false);
        });
      });
      didLogIn.catch((err) => {
        Toast.error(err);
        setLoggingIn(false);
        setBusy(false);
      });
    }
    setBusy(false);
  }

  useEffect(() => {
    setBusy(true);
    if (user) {
      let school = "";
      const userRef = doc(db, "userData", user.uid);
      getDoc(userRef).then((userSnap) => {
        if (userSnap.exists()) {
          school = userSnap.data().school;
        }
        dispatch(setUserState(user.displayName, user.email, false, school));
        setBusy(false);
        dynamicNavigate('home', 'root');
      }).catch((err) => {
        console.log(err);
        dispatch(setUserState(user.displayName, user.email, false, ""));
        setBusy(false);
        history.replace("/home");
      });
    }
    tabs.setShowTabs(false);
    setBusy(false);
    return () => {
      tabs.setShowTabs(true);
      setBusy(false);
    }
  }, [user, loading]);


  /**
   * Keyboard event listener useEffect
   */
  useEffect(() => {
    Keyboard.addListener('keyboardWillShow', info => {
      Keyboard.setResizeMode(defaultResizeOptions);
    });
    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);


  if (busy) {
    return (<IonSpinner class='ion-spinner' name="dots" color="primary" />);
  }

  return (
    <IonPage className="ion-page-ios-notch">
      <IonContent>
        {loggingIn ? (
          <IonLoading
            spinner="dots"
            message="Logging In"
            duration={0}
            isOpen={loggingIn}
          ></IonLoading>
        ) : (null)}
        <IonHeader style={{ padding: "5vh" }}>
          <Header darkMode={darkModeToggled} schoolName="" zoom={1.2} />
          <p style={{ textAlign: "center", fontSize: "1.1em" }}>Sign In</p>
        </IonHeader>

        <IonList inset={true} mode='ios' className='sign-in-sign-up-list'>
          <IonItem style={{height : "9%"}} mode='ios' >
            <IonLabel position="stacked">Email</IonLabel>
            <input className='login-input' type="email" ref={emailRef} onChange={(e: any) => { if (e && e.target && e.target.value) setEmailSignIn(e.target.value) }}></input>
          </IonItem>
          <IonItem style={{height : "9%"}} mode='ios' >
            <IonLabel position="stacked">Password</IonLabel>
            <input className='login-input' type="password" ref={passwordRef} onChange={(e: any) => { if (e && e.target && e.target.value) setPasswordSignIn(e.target.value) }}></input>
          </IonItem>
          <br />
          <IonButton color="transparent" mode='ios' onClick={() => { setLoggingIn(true); logIn(); }} shape="round" fill="outline" expand="block" id="signInButton" >Sign In</IonButton>
          <br />
          <br />
        </IonList>
        <p className='sign-in-sign-up-list'> or <Link to="/register">register</Link> for an account</p>
        <p className='sign-in-sign-up-list'> or <Link to="/forgot-password">forgot password?</Link></p>

      </IonContent>
    </IonPage>
  )

}

export default React.memo(LandingPage);